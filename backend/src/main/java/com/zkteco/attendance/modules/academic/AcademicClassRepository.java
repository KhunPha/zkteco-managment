package com.zkteco.attendance.modules.academic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcademicClassRepository extends JpaRepository<AcademicClass, Long> {
    List<AcademicClass> findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderByNameAsc(String companyCode, String academicYear);
    List<AcademicClass> findByAcademicYearAndDeletedAtIsNullOrderByNameAsc(String academicYear);
    List<AcademicClass> findByCompanyCodeAndAcademicYearAndGradeNameAndDeletedAtIsNullOrderByNameAsc(String companyCode, String academicYear, String gradeName);
    List<AcademicClass> findByAcademicYearAndGradeNameAndDeletedAtIsNullOrderByNameAsc(String academicYear, String gradeName);
    List<AcademicClass> findByCompanyCodeAndDeletedAtIsNullOrderByNameAsc(String companyCode);
    List<AcademicClass> findByDeletedAtIsNullOrderByNameAsc();
    Optional<AcademicClass> findByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(String companyCode, String academicYear, String name);
    boolean existsByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(String companyCode, String academicYear, String name);
    long countByCompanyCodeAndAcademicYearAndDeletedAtIsNull(String companyCode, String academicYear);
}

