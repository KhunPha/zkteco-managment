package com.zkteco.attendance.modules.backup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BackupConfigurationRepository extends JpaRepository<BackupConfiguration, Long> {
    Optional<BackupConfiguration> findByCompanyCode(String companyCode);
}

