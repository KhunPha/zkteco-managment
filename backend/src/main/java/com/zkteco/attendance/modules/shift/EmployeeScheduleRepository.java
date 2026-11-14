package com.zkteco.attendance.modules.shift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeScheduleRepository extends JpaRepository<EmployeeSchedule, Long> {
    List<EmployeeSchedule> findByEmployeeId(Long employeeId);
    List<EmployeeSchedule> findByStudentId(Long studentId);
    List<EmployeeSchedule> findByEmployeeCompanyCode(String companyCode);

    void deleteByEmployeeId(Long employeeId);
    void deleteByStudentId(Long studentId);

    @org.springframework.data.jpa.repository.Modifying
    @Query("DELETE FROM EmployeeSchedule s WHERE (s.employee IS NOT NULL AND (s.employee.deletedAt IS NOT NULL OR s.employee.employmentStatus = 'TERMINATED')) " +
           "OR (s.student IS NOT NULL AND (s.student.deletedAt IS NOT NULL OR s.student.status = 'WITHDRAWN')) " +
           "OR (s.employee IS NULL AND s.student IS NULL)")
    int purgeDeletedPersonnelSchedules();

    @Query("SELECT s FROM EmployeeSchedule s WHERE s.employee.id = :empId AND s.employee.deletedAt IS NULL AND s.effectiveFrom <= :date AND (s.effectiveTo IS NULL OR s.effectiveTo >= :date) ORDER BY s.effectiveFrom DESC")
    List<EmployeeSchedule> findActiveSchedules(@Param("empId") Long empId, @Param("date") LocalDate date);

    @Query("SELECT s FROM EmployeeSchedule s WHERE s.student.id = :stuId AND s.student.deletedAt IS NULL AND s.effectiveFrom <= :date AND (s.effectiveTo IS NULL OR s.effectiveTo >= :date) ORDER BY s.effectiveFrom DESC")
    List<EmployeeSchedule> findActiveStudentSchedules(@Param("stuId") Long stuId, @Param("date") LocalDate date);

    @Query("SELECT DISTINCT s.employee.id FROM EmployeeSchedule s WHERE s.employee IS NOT NULL AND s.employee.deletedAt IS NULL AND s.employee.employmentStatus != 'TERMINATED' AND (s.effectiveTo IS NULL OR s.effectiveTo >= CURRENT_DATE)")
    java.util.Set<Long> findEmployeeIdsWithActiveSchedule();

    @Query("SELECT DISTINCT s.student.id FROM EmployeeSchedule s WHERE s.student IS NOT NULL AND s.student.deletedAt IS NULL AND s.student.status != 'WITHDRAWN' AND (s.effectiveTo IS NULL OR s.effectiveTo >= CURRENT_DATE)")
    java.util.Set<Long> findStudentIdsWithActiveSchedule();

    @Query("SELECT s FROM EmployeeSchedule s LEFT JOIN FETCH s.shift LEFT JOIN FETCH s.employee e LEFT JOIN FETCH s.student st " +
           "WHERE (e IS NOT NULL AND e.deletedAt IS NULL AND e.employmentStatus != 'TERMINATED' AND ((?1 = 'all') OR (e.companyCode = ?1))) " +
           "   OR (st IS NOT NULL AND st.deletedAt IS NULL AND st.status != 'WITHDRAWN' AND ((?1 = 'all') OR (st.companyCode = ?1))) " +
           "ORDER BY s.id DESC")
    List<EmployeeSchedule> findAllByTenantCompanyCode(String companyCode);

    @Query("SELECT s FROM EmployeeSchedule s WHERE s.effectiveFrom <= :date AND (s.effectiveTo IS NULL OR s.effectiveTo >= :date)")
    List<EmployeeSchedule> findAllActiveSchedules(@Param("date") LocalDate date);
}

