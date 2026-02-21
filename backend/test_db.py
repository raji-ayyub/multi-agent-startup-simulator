import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Load environment variables
load_dotenv()

# Get database URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in environment variables")


# Create engine (Supabase-safe config)
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    connect_args={"sslmode": "require"}
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base model
Base = declarative_base()


# Test Table
class User(Base):
    __tablename__ = "users_test"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    email = Column(String(100))


def run_test():

    try:

        print("\n=== DATABASE CONNECTION TEST ===")

        print("Connecting to database...")

        # Create tables
        Base.metadata.create_all(bind=engine)

        print("✅ Table created successfully")


        # Open session
        db = SessionLocal()

        print("Session started")


        # Insert test data
        new_user = User(
            name="Ayyub",
            email="ayyub@test.com"
        )

        db.add(new_user)
        db.commit()

        print("✅ Data inserted successfully")


        # Query data
        users = db.query(User).all()

        print("\nUsers in database:")

        for user in users:
            print(f"ID={user.id} | Name={user.name} | Email={user.email}")


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