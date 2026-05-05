--branch
CREATE TABLE branch (
    BranchId SERIAL PRIMARY KEY,
    BranchName VARCHAR(255) NOT NULL,
    BranchLocation VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
--user

--admin

--manager

--employee
CREATE TABLE employee (
    EmployeeId SERIAL PRIMARY KEY,
    FirstName VARCHAR(150) NOT NULL, 
    LastName VARCHAR(150) NOT NULL,
    ContactInfo VARCHAR(255) NOT NULL,
    DateHired DATE NOT NULL, 
    branchAssigned VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (branchAssigned) REFERENCES branch(BranchId) ON DELETE SET NULL,
    FOREIGN KEY (DateHired) REFERENCES manager(DateHired) ON DELETE CASCADE
);

--availibility
CREATE TABLE availability (
    AvailabilityId SERIAL PRIMARY KEY,
    EmployeeId INT NOT NULL,
    AvalableDate DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    Notes VARCHAR(255),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (EmployeeId) REFERENCES employee(EmployeeId) ON DELETE CASCADE
);

--schedule
CREATE TABLE schedule (
    ScheduleId SERIAL PRIMARY KEY,
    EmployeeId INT NOT NULL,
    EmployeeRole VARCHAR(255) NOT NULL,
    ShiftDate DATE NOT NULL,
    StartTime TIME NOT NULL,
    EndTime TIME NOT NULL,
    EmployeeStatus VARCHAR(255) NOT NULL,
    BranchId INT NOT NULL,
    ApprovedBy VARCHAR(255), 
    BasedOnAvailability BOOLEAN NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (EmployeeId) REFERENCES employee(EmployeeId) ON DELETE CASCADE,
    FOREIGN KEY (BranchId) REFERENCES branch(BranchId) ON DELETE CASCADE,
    FOREIGN KEY (ApprovedBy) REFERENCES employee(EmployeeId) ON DELETE SET NULL,
    FOREIGN KEY (BasedOnAvailability) REFERENCES availability(AvailabilityId) ON DELETE SET NULL
)

--sales

--order

--orderitem

--discount

--product

--rawproduct

--inventorytransaction

--rawproducttransaction

--recipe

--report
CREATE TABLE report (
    ReportId SERIAL PRIMARY KEY,
    ReportType VARCHAR(255) NOT NULL,
    ReportDate DATE NOT NULL,
    BranchId INT NOT NULL,
    GeneratedBy VARCHAR(255) NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (GeneratedBy) REFERENCES employee(EmployeeId) ON DELETE SET NULL,
    FOREIGN KEY (BranchId) REFERENCES branch(BranchId) ON DELETE SET NULL
);

CREATE INDEX idx_employee_branch ON employee(branchId);
CREATE INDEX idx_availability_employee ON availability(EmployeeId);
CREATE INDEX idx_schedule_employee ON schedule(EmployeeId);
CREATE INDEX idx_schedule_date ON schedule(ShiftDate);