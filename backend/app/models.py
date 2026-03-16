import uuid
from enum import Enum

from tortoise import fields
from tortoise.models import Model


class CategoryEnum(str, Enum):
    lunettes = "Lunettes"
    lentilles = "Lentilles"


class ActionEnum(str, Enum):
    approved = "approved"
    flagged = "flagged"
    escalated = "escalated"
    blacklisted = "blacklisted"


class Provider(Model):
    id = fields.UUIDField(pk=True, default=uuid.uuid4)
    name = fields.CharField(max_length=255)
    created_at = fields.DatetimeField(auto_now_add=True)
    is_blacklisted = fields.BooleanField(default=False)
    risk_score = fields.FloatField(default=0)

    class Meta:
        table = "providers"

    def get_status(self) -> str:
        if self.is_blacklisted:
            return "blacklisted"
        if self.risk_score < 30:
            return "auto_approved"
        if self.risk_score <= 70:
            return "needs_review"
        return "auto_held"


class Claim(Model):
    id = fields.UUIDField(pk=True, default=uuid.uuid4)
    provider = fields.ForeignKeyField("models.Provider", related_name="claims")
    member_id = fields.CharField(max_length=255)
    month = fields.IntField()
    year = fields.IntField()
    category = fields.CharEnumField(enum_type=CategoryEnum)
    amount = fields.FloatField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "claims"


class FraudFlag(Model):
    id = fields.UUIDField(pk=True, default=uuid.uuid4)
    provider = fields.ForeignKeyField("models.Provider", related_name="flags")
    rule_triggered = fields.CharField(max_length=255)
    score_contribution = fields.FloatField()
    month = fields.IntField()
    year = fields.IntField()
    details = fields.JSONField()
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "fraud_flags"


class ReviewAction(Model):
    id = fields.UUIDField(pk=True, default=uuid.uuid4)
    provider = fields.ForeignKeyField("models.Provider", related_name="review_actions")
    action = fields.CharEnumField(enum_type=ActionEnum)
    note = fields.TextField(default="")
    reviewed_by = fields.CharField(max_length=255)
    created_at = fields.DatetimeField(auto_now_add=True)

    class Meta:
        table = "review_actions"
