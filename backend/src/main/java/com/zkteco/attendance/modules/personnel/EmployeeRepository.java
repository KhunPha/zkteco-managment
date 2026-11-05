package com.zkteco.attendance.modules.personnel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeRepository extends JpaRepository<Employee, Long>, JpaSpecificationExecutor<Employee> {
    Optional<Employee> findByEmployeeCodeAndDeletedAtIsNull(String employeeCode);
    boolean existsByEmployeeCodeAndDeletedAtIsNull(String employeeCode);
    long countByEmploymentStatusAndDeletedAtIsNull(String employmentStatus);
    List<Employee> findByDeletedAtIsNull();
    List<Employee> findByDepartmentIdAndDeletedAtIsNull(Long departmentId);
    List<Employee> findByBranchIdAndDeletedAtIsNull(Long branchId);
}


