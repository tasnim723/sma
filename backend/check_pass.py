from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hash_str = "$2b$12$7AJZ7.JOIfNrmdMJKdDUHuSwDfGCdyvha.3J8y5/K2/rETFqS0Ft2"
print("Matches:", pwd_context.verify("password123", hash_str))
