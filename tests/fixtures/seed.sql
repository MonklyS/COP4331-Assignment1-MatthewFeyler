-- Test users for the API integration tests (tests/integration/api.test.js).
-- CI loads this into a throwaway database right after database/schema.sql.
USE COP4331;

INSERT INTO Users (FirstName, LastName, Login, Password) VALUES
	('Test',  'User', 'testuser',  'testpass'),
	('Other', 'User', 'otheruser', 'otherpass');
