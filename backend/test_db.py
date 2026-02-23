import os
from dotenv import load_dotenv
from sqlalchemy.exc import SQLAlchemyError
from database import engine, SessionLocal, create_tables
from models import User
from auth import hash_password, verify_password

# Load environment variables
load_dotenv()


def run_test():
    """Test database connectivity and user authentication flow."""

    try:
        print("\n=== DATABASE CONNECTION TEST ===")
        print("Connecting to database...")

        create_tables()
        print("✅ Tables created successfully")

        db = SessionLocal()
        print("✅ Session started")

        existing_user = db.query(User).filter(User.email == "ayyub@test.com").first()
        if existing_user:
            print("⚠️  Test user already exists, skipping insertion")
        else:
            hashed_pwd = hash_password("testpassword123")
            new_user = User(
                email="ayyub@test.com",
                full_name="Ayyub Test",
                hashed_password=hashed_pwd,
                company_name="Test Company",
            )

            db.add(new_user)
            db.commit()
            print("✅ User created successfully")

        users = db.query(User).all()
        print(f"\n📊 Total users in database: {len(users)}")
        print("\nUsers:")

        for user in users:
            print(
                f"  ID={user.id} | Email={user.email} | Name={user.full_name} | "
                f"Company={user.company_name} | Active={user.is_active} | "
                f"Created={user.created_at}"
            )

        if existing_user or db.query(User).filter(User.email == "ayyub@test.com").first():
            test_user = db.query(User).filter(User.email == "ayyub@test.com").first()
            password_correct = verify_password("testpassword123", test_user.hashed_password)
            print(f"\n🔐 Password verification test: {'✅ PASSED' if password_correct else '❌ FAILED'}")

        db.close()
        print("\n✅ TEST COMPLETED SUCCESSFULLY")

    except SQLAlchemyError as e:
        print("\n❌ Database Error:")
        print(e)

    except Exception as e:
        print("\n❌ Unexpected Error:")
        print(e)


if __name__ == "__main__":
    run_test()