package com.zkteco.attendance.modules.organization;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PositionRepository extends JpaRepository<Position, Long> {
    Optional<Position> findByCode(String code);
    boolean existsByCode(String code);
    List<Position> findAllByActiveTrue();
}

