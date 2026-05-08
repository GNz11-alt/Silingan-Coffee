--enabe rls on all tables
ALTER TABLE employee ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY; 
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE report ENABLE ROW LEVEL SECURITY;

-- admin policy allowing to see all records
CREATE POLICY "Admin sees all employees" ON employee
    FOR SELECT USING (current_setting('request.jwt.claims', true)::json ->> 'role' = 'admin');

CREATE POLICY "Admin sees all schedules" ON schedule
    FOR SELECT USING (current_setting('request.jwt.claims', true)::json ->> 'role' = 'admin');

-- manager policy allowing to see records of their branch
CREATE POLICY "Manager sees employees of their branch" ON employee
   FOR SELECT USING (
        branchid = (
            SELECT branch_id FROM employee WHERE id = current-setting('request.jwt.claims', true):: json ->> 'sub'
        )
    );

--employee / staff policy seeing only their own records
CREATE POLICY "Employee sees own records" ON availability
    FOR SELECT USING (employeeid = current_setting('request.jwt.claims', true)::json ->> 'sub');

CREATE POLICY "Employee sees own schedule" ON schedule
    SELECT USING (employeeid = current-setting('request.jwt.claims', true)::json ->> 'sub');
