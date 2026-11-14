package com.zkteco.attendance.modules.academic;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AcademicGradeRepository extends JpaRepository<AcademicGrade, Long> {
    List<AcademicGrade> findByCompanyCodeAndAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(String companyCode, String academicYear);
    List<AcademicGrade> findByAcademicYearAndDeletedAtIsNullOrderBySequenceOrderAsc(String academicYear);
    List<AcademicGrade> findByCompanyCodeAndDeletedAtIsNullOrderBySequenceOrderAsc(String companyCode);
    List<AcademicGrade> findByDeletedAtIsNullOrderBySequenceOrderAsc();
    Optional<AcademicGrade> findByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(String companyCode, String academicYear, String name);
    boolean existsByCompanyCodeAndAcademicYearAndNameAndDeletedAtIsNull(String companyCode, String academicYear, String name);
}

