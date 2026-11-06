package com.zkteco.attendance.modules.biometric;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FaceBiometricRepository extends JpaRepository<FaceBiometric, Long> {

    Optional<FaceBiometric> findByDevicePin(String devicePin);

    Optional<FaceBiometric> findByEmployeeId(Long employeeId);

    Optional<FaceBiometric> findByStudentId(Long studentId);

    boolean existsByDevicePin(String devicePin);

    void deleteByDevicePin(String devicePin);

    @Query("SELECT f FROM FaceBiometric f LEFT JOIN FETCH f.employee LEFT JOIN FETCH f.student")
    List<FaceBiometric> findAllWithPersonnel();
}

