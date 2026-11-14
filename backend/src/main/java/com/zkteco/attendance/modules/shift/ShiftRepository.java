package com.zkteco.attendance.modules.shift;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {
    Optional<Shift> findByCode(String code);
    boolean existsByCode(String code);
    boolean existsByCompanyCodeAndCode(String companyCode, String code);
    List<Shift> findAllByActiveTrue();
    List<Shift> findByCompanyCode(String companyCode);
    List<Shift> findByCompanyCodeAndActiveTrue(String companyCode);
}

