package com.zkteco.attendance.modules.device;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CardHistoryRepository extends JpaRepository<CardHistory, Long>, JpaSpecificationExecutor<CardHistory> {

    List<CardHistory> findByDevicePinOrderByCreatedAtDesc(String devicePin);

    List<CardHistory> findByEmployeeIdOrderByCreatedAtDesc(Long employeeId);

    List<CardHistory> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    Optional<CardHistory> findFirstByDevicePinAndStatusOrderByCreatedAtDesc(String devicePin, String status);

    @org.springframework.data.jpa.repository.Query("SELECT h.devicePin, COUNT(h) FROM CardHistory h GROUP BY h.devicePin")
    List<Object[]> countGroupedByDevicePin();

    Page<CardHistory> findAllByOrderByCreatedAtDesc(Pageable pageable);
}

