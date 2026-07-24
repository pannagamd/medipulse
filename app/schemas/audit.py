from datetime import datetime

from pydantic import BaseModel


class AuditLogRead(BaseModel):
    id: str
    actor_user_id: str | None
    action: str
    entity_type: str | None
    entity_id: str | None
    details: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

