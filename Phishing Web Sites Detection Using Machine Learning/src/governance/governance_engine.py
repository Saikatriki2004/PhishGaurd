"""
Safety Governance Enforcement Module

PURPOSE:
    Implement executable governance rules that enforce safety invariants
    independently of human judgment. This module is the authoritative
    source of truth for policy enforcement.

SAFETY INVARIANTS (NON-NEGOTIABLE):
    1. Trusted domains → NEVER PHISHING
    2. ML → NEVER overrides policy gates
    3. Missing data → NEVER increases severity
    4. Drift → ONLY reduces confidence
    5. Regressions → FAIL FAST, block deployment

GOVERNANCE CAPABILITIES:
    1. Override Authority Boundaries (who, when, for how long)
    2. Canary Promotion Enforcement (signal volume, not just count)
    3. Calibration as Policy Input (CI and runtime binding)
    4. Safety Budgets & Escalation (limits + freeze triggers)
    5. Policy-as-Code Verification (doc-code consistency)

DESIGN PRINCIPLE:
    Every rule is executable. Every exception is logged.
    The system remains safe even when original authors are gone.
"""

import os
import json
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional, Set
from enum import Enum

logger = logging.getLogger(__name__)


# ============================================================================
# CONFIGURATION CONSTANTS
# ============================================================================

# Override authority levels
class OverrideAuthority(Enum):
    """
    Who can trigger overrides.
    
    SECURITY-TEAM: Permanent policy changes
    ON-CALL: Emergency overrides (must expire)
    CI-SYSTEM: Automated overrides (strictly controlled)
    """
    SECURITY_TEAM = "security-team"
    ON_CALL = "on-call"
    CI_SYSTEM = "ci-system"


# Override types
class OverrideType(Enum):
    """
    Types of overrides with different governance rules.
    """
    PERMANENT = "permanent"  # Requires SECURITY_TEAM + change_reason
    EMERGENCY = "emergency"  # Requires ON_CALL + expiration
    TESTING = "testing"      # CI_SYSTEM only + auto-expires


# Maximum durations for override types
OVERRIDE_MAX_DURATION = {
    OverrideType.PERMANENT: None,  # No expiration (requires full review)
    OverrideType.EMERGENCY: timedelta(hours=24),
    OverrideType.TESTING: timedelta(hours=1),
}

# Safety budget limits (per rolling window)
SAFETY_BUDGET_WINDOW = timedelta(hours=24)
SAFETY_BUDGET_LIMITS = {
    "suspicious_on_trusted": 0,  # NO tolerance - trusted = SAFE only
    "overrides_per_window": 3,    # Max 3 emergency overrides per 24h
    "canary_failures": 5,         # Max 5 canary failures before escalation
}

# Canary promotion requirements
CANARY_MIN_PASSES = 5
CANARY_MIN_SAMPLE_SIZE = 100  # Minimum predictions to consider valid signal


# ============================================================================
# DATA CLASSES
# ============================================================================

@dataclass
class Override:
    """
    Represents a policy override with full governance metadata.
    """
    override_id: str
    override_type: str  # OverrideType value
    authority: str  # OverrideAuthority value
    created_at: str  # ISO 8601
    expires_at: Optional[str]  # ISO 8601 or None for permanent
    affected_domains: List[str]
    reason: str
    approved_by: str
    review_ticket: Optional[str]  # Required for PERMANENT
    is_active: bool = True
    
    def is_expired(self) -> bool:
        """Check if override has expired."""
        if self.expires_at is None:
            return False
        expiry = datetime.fromisoformat(self.expires_at.replace('Z', '+00:00'))
        return datetime.now(timezone.utc) > expiry
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class CanarySignal:
    """
    Represents validation signal for a canary domain.
    """
    domain: str
    test_runs: int = 0
    passes: int = 0
    failures: int = 0
    sample_size: int = 0  # Total predictions evaluated
    last_run: Optional[str] = None
    last_verdict: Optional[str] = None
    consecutive_passes: int = 0
    
    def pass_rate(self) -> float:
        if self.test_runs == 0:
            return 0.0
        return self.passes / self.test_runs
    
    def has_sufficient_signal(self) -> bool:
        """Check if we have enough data to make promotion decision."""
        return (
            self.test_runs >= CANARY_MIN_PASSES and
            self.sample_size >= CANARY_MIN_SAMPLE_SIZE
        )
    
    def is_promotable(self) -> bool:
        """Check if canary meets promotion criteria."""
        return (
            self.has_sufficient_signal() and
            self.consecutive_passes >= CANARY_MIN_PASSES and
            self.pass_rate() >= 1.0  # 100% pass rate required
        )


@dataclass
class SafetyBudgetStatus:
    """
    Tracks safety budget consumption.
    """
    window_start: str
    suspicious_on_trusted: int = 0
    overrides_used: int = 0
    canary_failures: int = 0
    is_frozen: bool = False
    freeze_reason: Optional[str] = None
    
    def is_budget_exceeded(self) -> Dict[str, bool]:
        """Check which budgets are exceeded."""
        return {
            "suspicious_on_trusted": self.suspicious_on_trusted > SAFETY_BUDGET_LIMITS["suspicious_on_trusted"],
            "overrides_per_window": self.overrides_used > SAFETY_BUDGET_LIMITS["overrides_per_window"],
            "canary_failures": self.canary_failures > SAFETY_BUDGET_LIMITS["canary_failures"],
        }


# ============================================================================
# GOVERNANCE ENGINE
# ============================================================================

class GovernanceEngine:
    """
    Central enforcement engine for all governance rules.
    
    DESIGN PRINCIPLES:
    - Every rule is executable
    - Every exception is logged
    - Prefer rejection over risk
    - Fail fast on violations
    """
    
    STATE_FILE = "governance_state.json"
    
    def __init__(self, state_dir: str = "."):
        """
        Initialize governance engine.
        
        Args:
            state_dir: Directory for state files
        """
        self.state_dir = state_dir
        self.state_path = os.path.join(state_dir, self.STATE_FILE)
        self._load_state()
        logger.info("[GOVERNANCE] Engine initialized")
    
    def _load_state(self) -> None:
        """Load governance state from disk."""
        if os.path.exists(self.state_path):
            with open(self.state_path, 'r') as f:
                data = json.load(f)
            self.overrides = [Override(**o) for o in data.get("overrides", [])]
            self.canary_signals = {
                k: CanarySignal(**v) for k, v in data.get("canary_signals", {}).items()
            }
            budget_data = data.get("safety_budget")
            if budget_data:
                self.safety_budget = SafetyBudgetStatus(**budget_data)
            else:
                self._reset_safety_budget()
        else:
            self.overrides = []
            self.canary_signals = {}
            self._reset_safety_budget()
    
    def _save_state(self) -> None:
        """Persist governance state to disk."""
        data = {
            "overrides": [o.to_dict() for o in self.overrides],
            "canary_signals": {k: asdict(v) for k, v in self.canary_signals.items()},
            "safety_budget": asdict(self.safety_budget),
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        with open(self.state_path, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _reset_safety_budget(self) -> None:
        """Reset safety budget for new window."""
        self.safety_budget = SafetyBudgetStatus(
            window_start=datetime.now(timezone.utc).isoformat()
        )
    
    # =========================================================================
    # OVERRIDE AUTHORITY BOUNDARIES
    # =========================================================================
    
    def request_override(
        self,
        override_type: OverrideType,
        authority: OverrideAuthority,
        affected_domains: List[str],
        reason: str,
        approved_by: str,
        review_ticket: Optional[str] = None,
        duration: Optional[timedelta] = None
    ) -> Override:
        """
        Request a policy override with full governance validation.
        
        VALIDATION RULES:
        - PERMANENT: Requires SECURITY_TEAM + review_ticket
        - EMERGENCY: Requires ON_CALL + expiration
        - TESTING: Only CI_SYSTEM + auto-expires in 1h
        
        Raises:
            ValueError: If validation fails
        """
        # Check if system is frozen
        if self.safety_budget.is_frozen:
            raise ValueError(
                f"System is frozen: {self.safety_budget.freeze_reason}\n"
                "No overrides allowed until freeze is lifted."
            )
        
        # Validate authority for override type
        self._validate_authority(override_type, authority, review_ticket)
        
        # Calculate expiration
        expires_at = self._calculate_expiration(override_type, duration)
        
        # Check budget
        exceeded = self.safety_budget.is_budget_exceeded()
        if exceeded.get("overrides_per_window"):
            self._trigger_freeze("Override budget exceeded")
            raise ValueError("Override budget exceeded. System frozen.")
        
        # Create override
        override = Override(
            override_id=self._generate_override_id(),
            override_type=override_type.value,
            authority=authority.value,
            created_at=datetime.now(timezone.utc).isoformat(),
            expires_at=expires_at,
            affected_domains=affected_domains,
            reason=reason,
            approved_by=approved_by,
            review_ticket=review_ticket,
            is_active=True
        )
        
        # Record and save
        self.overrides.append(override)
        self.safety_budget.overrides_used += 1
        self._save_state()
        
        # Emit warning
        self._emit_override_warning(override)
        
        logger.warning(f"[GOVERNANCE] Override granted: {override.override_id}")
        return override
    
    def _validate_authority(
        self,
        override_type: OverrideType,
        authority: OverrideAuthority,
        review_ticket: Optional[str]
    ) -> None:
        """Validate authority matches override type requirements."""
        if override_type == OverrideType.PERMANENT:
            if authority != OverrideAuthority.SECURITY_TEAM:
                raise ValueError(
                    f"PERMANENT overrides require SECURITY_TEAM authority, got {authority.value}"
                )
            if not review_ticket:
                raise ValueError(
                    "PERMANENT overrides require a review_ticket reference"
                )
        
        elif override_type == OverrideType.EMERGENCY:
            if authority not in [OverrideAuthority.SECURITY_TEAM, OverrideAuthority.ON_CALL]:
                raise ValueError(
                    f"EMERGENCY overrides require SECURITY_TEAM or ON_CALL, got {authority.value}"
                )
        
        elif override_type == OverrideType.TESTING:
            if authority != OverrideAuthority.CI_SYSTEM:
                raise ValueError(
                    f"TESTING overrides are for CI_SYSTEM only, got {authority.value}"
                )
    
    def _calculate_expiration(
        self,
        override_type: OverrideType,
        duration: Optional[timedelta]
    ) -> Optional[str]:
        """Calculate expiration timestamp."""
        max_duration = OVERRIDE_MAX_DURATION[override_type]
        
        if max_duration is None:
            # Permanent override
            return None
        
        if duration is None:
            duration = max_duration
        elif duration > max_duration:
            logger.warning(
                f"[GOVERNANCE] Requested duration {duration} exceeds max {max_duration}, capping"
            )
            duration = max_duration
        
        expiry = datetime.now(timezone.utc) + duration
        return expiry.isoformat()
    
    def _generate_override_id(self) -> str:
        """Generate unique override ID."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        random_suffix = hashlib.sha256(os.urandom(8)).hexdigest()[:8]
        return f"OVERRIDE-{timestamp}-{random_suffix}"
    
    def _emit_override_warning(self, override: Override) -> None:
        """Emit visible warning about override."""
        import sys
        lines = [
            "",
            "=" * 70,
            "⚠️  POLICY OVERRIDE ACTIVATED",
            "=" * 70,
            f"ID:        {override.override_id}",
            f"Type:      {override.override_type}",
            f"Authority: {override.authority}",
            f"Expires:   {override.expires_at or 'NEVER (permanent)'}",
            f"Reason:    {override.reason}",
            f"Approved:  {override.approved_by}",
            f"Ticket:    {override.review_ticket or 'N/A'}",
            "=" * 70,
            ""
        ]
        for line in lines:
            print(line, file=sys.stderr)
    
    def get_active_overrides(self) -> List[Override]:
        """Get all currently active (non-expired) overrides."""
        active = []
        for override in self.overrides:
            if override.is_active and not override.is_expired():
                active.append(override)
            elif override.is_active and override.is_expired():
                # Mark as inactive
                override.is_active = False
                logger.info(f"[GOVERNANCE] Override expired: {override.override_id}")
        self._save_state()
        return active
    
    def revoke_override(self, override_id: str, revoked_by: str, reason: str) -> None:
        """Revoke an active override."""
        for override in self.overrides:
            if override.override_id == override_id:
                override.is_active = False
                logger.warning(
                    f"[GOVERNANCE] Override revoked: {override_id} by {revoked_by}: {reason}"
                )
                self._save_state()
                return
        raise ValueError(f"Override not found: {override_id}")
    
    # =========================================================================
    # CANARY PROMOTION ENFORCEMENT
    # =========================================================================
    
    def record_canary_result(
        self,
        domain: str,
        verdict: str,
        sample_size: int = 1
    ) -> CanarySignal:
        """
        Record a canary test result.
        
        RULES:
        - PHISHING verdict → failure
        - SAFE/SUSPICIOUS → pass
        - Consecutive passes required for promotion
        """
        if domain not in self.canary_signals:
            self.canary_signals[domain] = CanarySignal(domain=domain)
        
        signal = self.canary_signals[domain]
        signal.test_runs += 1
        signal.sample_size += sample_size
        signal.last_run = datetime.now(timezone.utc).isoformat()
        signal.last_verdict = verdict
        
        if verdict == "PHISHING":
            signal.failures += 1
            signal.consecutive_passes = 0  # Reset consecutive count
            self.safety_budget.canary_failures += 1
            
            # Check if budget exceeded
            if self.safety_budget.is_budget_exceeded().get("canary_failures"):
                self._trigger_freeze("Canary failure budget exceeded")
        else:
            signal.passes += 1
            signal.consecutive_passes += 1
        
        self._save_state()
        return signal
    
    def check_promotion_eligibility(self, domain: str) -> Dict[str, Any]:
        """
        Check if a canary domain is eligible for promotion.
        
        Returns detailed eligibility report.
        """
        if domain not in self.canary_signals:
            return {
                "eligible": False,
                "reason": "No signal data recorded",
                "signal": None
            }
        
        signal = self.canary_signals[domain]
        
        # Check sufficient signal
        if not signal.has_sufficient_signal():
            return {
                "eligible": False,
                "reason": f"Insufficient signal: {signal.test_runs}/{CANARY_MIN_PASSES} runs, "
                          f"{signal.sample_size}/{CANARY_MIN_SAMPLE_SIZE} samples",
                "signal": asdict(signal)
            }
        
        # Check consecutive passes
        if signal.consecutive_passes < CANARY_MIN_PASSES:
            return {
                "eligible": False,
                "reason": f"Insufficient consecutive passes: {signal.consecutive_passes}/{CANARY_MIN_PASSES}",
                "signal": asdict(signal)
            }
        
        # Check pass rate
        if signal.pass_rate() < 1.0:
            return {
                "eligible": False,
                "reason": f"Pass rate {signal.pass_rate():.1%} < 100% required",
                "signal": asdict(signal)
            }
        
        return {
            "eligible": True,
            "reason": "All promotion criteria met",
            "signal": asdict(signal),
            "requires_approval": True,
            "approval_metadata_required": [
                "approved_by",
                "approval_date",
                "review_ticket"
            ]
        }
    
    def promote_canary(
        self,
        domain: str,
        approved_by: str,
        review_ticket: str
    ) -> Dict[str, Any]:
        """
        Promote a canary domain to regression set.
        
        REQUIRES:
        - Promotion eligibility
        - Explicit approval metadata
        """
        eligibility = self.check_promotion_eligibility(domain)
        
        if not eligibility["eligible"]:
            raise ValueError(f"Cannot promote: {eligibility['reason']}")
        
        # Record promotion (actual manifest update is separate)
        promotion_record = {
            "domain": domain,
            "promoted_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": approved_by,
            "review_ticket": review_ticket,
            "signal": eligibility["signal"]
        }
        
        logger.info(f"[GOVERNANCE] Canary promoted: {domain} by {approved_by}")
        return promotion_record
    
    # =========================================================================
    # CALIBRATION AS POLICY INPUT
    # =========================================================================
    
    def get_calibration_policy_adjustment(
        self,
        calibration_status: str
    ) -> Dict[str, Any]:
        """
        Get policy adjustments based on calibration status.
        
        RULES:
        - healthy: No adjustment
        - degraded: Confidence penalty, restrict PHISHING verdicts
        - unknown: Warning mode, restrict PHISHING verdicts
        """
        if calibration_status == "healthy":
            return {
                "confidence_penalty": 0.0,
                "restrict_phishing": False,
                "require_warning": False,
                "ci_should_warn": False
            }
        
        elif calibration_status == "degraded":
            return {
                "confidence_penalty": 0.20,  # 20% reduction
                "restrict_phishing": True,   # PHISHING → SUSPICIOUS
                "require_warning": True,
                "ci_should_warn": True,
                "warning_message": "Model calibration is degraded. Confidence reduced."
            }
        
        else:  # unknown
            return {
                "confidence_penalty": 0.10,
                "restrict_phishing": True,
                "require_warning": True,
                "ci_should_warn": True,
                "warning_message": "Calibration status unknown. Results may be unreliable."
            }
    
    def apply_calibration_restriction(
        self,
        original_verdict: str,
        calibration_status: str
    ) -> str:
        """
        Apply calibration-based verdict restriction.
        
        RULE: Degraded/unknown calibration → PHISHING becomes SUSPICIOUS
        """
        adjustment = self.get_calibration_policy_adjustment(calibration_status)
        
        if adjustment["restrict_phishing"] and original_verdict == "PHISHING":
            logger.warning(
                "[GOVERNANCE] Verdict restricted due to calibration: PHISHING → SUSPICIOUS"
            )
            return "SUSPICIOUS"
        
        return original_verdict
    
    # =========================================================================
    # SAFETY BUDGETS & ESCALATION
    # =========================================================================
    
    def record_safety_event(self, event_type: str) -> None:
        """
        Record a safety-related event for budget tracking.
        
        Event types:
        - suspicious_on_trusted: SUSPICIOUS verdict on a trusted domain
        - override: Policy override used
        - canary_failure: Canary domain received PHISHING
        """
        if event_type == "suspicious_on_trusted":
            self.safety_budget.suspicious_on_trusted += 1
            # This should NEVER happen - trigger immediate freeze
            self._trigger_freeze(
                f"CRITICAL: SUSPICIOUS verdict on trusted domain"
            )
        
        elif event_type == "override":
            self.safety_budget.overrides_used += 1
        
        elif event_type == "canary_failure":
            self.safety_budget.canary_failures += 1
        
        # Check budgets
        exceeded = self.safety_budget.is_budget_exceeded()
        for budget_type, is_exceeded in exceeded.items():
            if is_exceeded and not self.safety_budget.is_frozen:
                self._trigger_freeze(f"Safety budget exceeded: {budget_type}")
        
        self._save_state()
    
    def _trigger_freeze(self, reason: str) -> None:
        """
        Trigger safety freeze.
        
        When frozen:
        - No new overrides allowed
        - CI must fail
        - Requires manual intervention
        """
        self.safety_budget.is_frozen = True
        self.safety_budget.freeze_reason = reason
        
        import sys
        lines = [
            "",
            "!" * 70,
            "🚨  SAFETY FREEZE TRIGGERED",
            "!" * 70,
            f"Reason: {reason}",
            f"Time:   {datetime.now(timezone.utc).isoformat()}",
            "",
            "ACTIONS REQUIRED:",
            "1. Investigate the safety violation",
            "2. Fix root cause",
            "3. Manually lift freeze via governance API",
            "!" * 70,
            ""
        ]
        for line in lines:
            print(line, file=sys.stderr)
            logger.critical(line)
        
        self._save_state()
    
    def lift_freeze(self, lifted_by: str, resolution: str, review_ticket: str) -> None:
        """
        Lift a safety freeze.
        
        REQUIRES explicit approval and documentation.
        """
        if not self.safety_budget.is_frozen:
            return
        
        logger.warning(
            f"[GOVERNANCE] Freeze lifted by {lifted_by}: {resolution} (ticket: {review_ticket})"
        )
        
        self.safety_budget.is_frozen = False
        self.safety_budget.freeze_reason = None
        self._reset_safety_budget()
        self._save_state()
    
    def get_safety_status(self) -> Dict[str, Any]:
        """Get current safety status summary."""
        return {
            "is_frozen": self.safety_budget.is_frozen,
            "freeze_reason": self.safety_budget.freeze_reason,
            "budget_usage": {
                "suspicious_on_trusted": f"{self.safety_budget.suspicious_on_trusted}/{SAFETY_BUDGET_LIMITS['suspicious_on_trusted']}",
                "overrides": f"{self.safety_budget.overrides_used}/{SAFETY_BUDGET_LIMITS['overrides_per_window']}",
                "canary_failures": f"{self.safety_budget.canary_failures}/{SAFETY_BUDGET_LIMITS['canary_failures']}"
            },
            "budget_exceeded": self.safety_budget.is_budget_exceeded(),
            "active_overrides": len(self.get_active_overrides()),
            "window_start": self.safety_budget.window_start
        }
    
    # =========================================================================
    # POLICY-AS-CODE VERIFICATION
    # =========================================================================
    
    def verify_policy_consistency(self) -> Dict[str, Any]:
        """
        Verify that governance docs match executable rules.
        
        Checks:
        1. Manifest exists and is valid
        2. Snapshot matches manifest version
        3. Thresholds match code constants
        """
        errors = []
        warnings = []
        
        # Check manifest
        manifest_path = os.path.join(self.state_dir, "trusted_domains_manifest.json")
        if not os.path.exists(manifest_path):
            errors.append("Manifest file missing: trusted_domains_manifest.json")
        else:
            with open(manifest_path, 'r') as f:
                manifest = json.load(f)
            
            if not manifest.get("version"):
                errors.append("Manifest missing 'version' field")
            if not manifest.get("change_reason"):
                errors.append("Manifest missing 'change_reason' field")
        
        # Check snapshot
        snapshot_path = os.path.join(self.state_dir, "tests", "fixtures", "trusted_domains_snapshot.json")
        if not os.path.exists(snapshot_path):
            errors.append("Snapshot file missing")
        else:
            with open(snapshot_path, 'r') as f:
                snapshot = json.load(f)
            
            # Version check
            if os.path.exists(manifest_path):
                if snapshot.get("_manifest_version") != manifest.get("version"):
                    errors.append(
                        f"Version mismatch: manifest={manifest.get('version')}, "
                        f"snapshot={snapshot.get('_manifest_version')}"
                    )
        
        # Check calibration metrics
        calibration_path = os.path.join(self.state_dir, "calibration_metrics.json")
        if not os.path.exists(calibration_path):
            warnings.append("Calibration metrics file missing")
        else:
            with open(calibration_path, 'r') as f:
                calibration = json.load(f)
            
            status = calibration.get("calibration_status")
            if status != "healthy":
                warnings.append(f"Calibration status is '{status}', not 'healthy'")
        
        return {
            "consistent": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "should_fail_ci": len(errors) > 0
        }


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

_engine: Optional[GovernanceEngine] = None


def get_governance_engine(state_dir: str = ".") -> GovernanceEngine:
    """Get or create governance engine."""
    global _engine
    if _engine is None:
        _engine = GovernanceEngine(state_dir)
    return _engine


def verify_governance() -> Dict[str, Any]:
    """Run full governance verification."""
    engine = get_governance_engine()
    return engine.verify_policy_consistency()


def check_safety_status() -> Dict[str, Any]:
    """Get current safety status."""
    engine = get_governance_engine()
    return engine.get_safety_status()


# ============================================================================
# CLI
# ============================================================================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Governance Enforcement CLI")
    parser.add_argument("--verify", action="store_true", help="Verify policy consistency")
    parser.add_argument("--status", action="store_true", help="Show safety status")
    parser.add_argument("--list-overrides", action="store_true", help="List active overrides")
    parser.add_argument("--check-canary", type=str, help="Check canary promotion eligibility")
    
    args = parser.parse_args()
    
    engine = get_governance_engine()
    
    if args.verify:
        result = engine.verify_policy_consistency()
        print(json.dumps(result, indent=2))
        if result["should_fail_ci"]:
            exit(1)
    
    elif args.status:
        status = engine.get_safety_status()
        print(json.dumps(status, indent=2))
        if status["is_frozen"]:
            exit(1)
    
    elif args.list_overrides:
        overrides = engine.get_active_overrides()
        for o in overrides:
            print(f"{o.override_id}: {o.override_type} by {o.authority} - {o.reason}")
        if not overrides:
            print("No active overrides")
    
    elif args.check_canary:
        result = engine.check_promotion_eligibility(args.check_canary)
        print(json.dumps(result, indent=2))
    
    else:
        parser.print_help()
