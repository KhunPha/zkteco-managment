package com.zkteco.attendance.modules.personnel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long>, JpaSpecificationExecutor<Student> {
    Optional<Student> findByStudentCodeAndDeletedAtIsNull(String studentCode);
    Optional<Student> findFirstByStudentCodeOrderByIdDesc(String studentCode);
    boolean existsByStudentCodeAndDeletedAtIsNull(String studentCode);
    long countByStatusAndDeletedAtIsNull(String status);
}

