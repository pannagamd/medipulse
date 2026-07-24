import io

import pytest
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from app.models.interaction import DrugInteraction
from app.services.import_service import ImportService


@pytest.mark.anyio
async def test_ddinter_import_updates_duplicate_pair_instead_of_inserting_twice(db: Session) -> None:
    first_csv = (
        "drug_a,drug_b,severity,explanation,recommendations\n"
        "Warfarin,Aspirin,moderate,First explanation,Monitor\n"
    )
    second_csv = (
        "drug_a,drug_b,severity,explanation,recommendations\n"
        "Aspirin,Warfarin,dangerous,Updated explanation,Avoid\n"
    )

    await ImportService(db).import_ddinter(
        UploadFile(filename="first.csv", file=io.BytesIO(first_csv.encode("utf-8"))),
        "DDInter",
    )
    await ImportService(db).import_ddinter(
        UploadFile(filename="second.csv", file=io.BytesIO(second_csv.encode("utf-8"))),
        "DDInter",
    )

    rows = list(db.scalars(select(DrugInteraction)).all())
    assert len(rows) == 1
    assert rows[0].severity == "dangerous"
    assert rows[0].explanation == "Updated explanation"
