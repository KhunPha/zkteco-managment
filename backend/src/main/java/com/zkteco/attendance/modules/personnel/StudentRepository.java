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
    boolean existsByCompanyCodeAndStudentCodeAndDeletedAtIsNull(String companyCode, String studentCode);
    Optional<Student> findByCompanyCodeAndStudentCodeAndDeletedAtIsNull(String companyCode, String studentCode);
    long countByStatusAndDeletedAtIsNull(String status);
    long countByCompanyCodeAndStatusAndDeletedAtIsNull(String companyCode, String status);
    java.util.List<Student> findByCompanyCodeAndDeletedAtIsNull(String companyCode);
    java.util.List<Student> findByDeletedAtIsNull();

    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT s.className FROM Student s WHERE s.deletedAt IS NULL AND s.className IS NOT NULL ORDER BY s.className")
    java.util.List<String> findDistinctClassNames();

    long countByCompanyCodeAndAcademicYearAndDeletedAtIsNull(String companyCode, String academicYear);
    long countByAcademicYearAndDeletedAtIsNull(String academicYear);

    long countByCompanyCodeAndAcademicYearAndGradeAndDeletedAtIsNull(String companyCode, String academicYear, String grade);
    long countByAcademicYearAndGradeAndDeletedAtIsNull(String academicYear, String grade);

    long countByCompanyCodeAndAcademicYearAndClassNameAndDeletedAtIsNull(String companyCode, String academicYear, String className);
    long countByAcademicYearAndClassNameAndDeletedAtIsNull(String academicYear, String className);

    java.util.List<Student> findByCompanyCodeAndAcademicYearAndClassNameAndDeletedAtIsNullOrderByEnglishNameAsc(String companyCode, String academicYear, String className);
    java.util.List<Student> findByAcademicYearAndClassNameAndDeletedAtIsNullOrderByEnglishNameAsc(String academicYear, String className);
}

