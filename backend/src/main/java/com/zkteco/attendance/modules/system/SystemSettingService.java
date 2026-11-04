package com.zkteco.attendance.modules.system;

import com.zkteco.attendance.common.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {
    Optional<SystemSetting> findBySettingKey(String settingKey);
    List<SystemSetting> findByCategory(String category);
}

@Service
@RequiredArgsConstructor
public class SystemSettingService {

    private final SystemSettingRepository settingRepository;

    @Transactional(readOnly = true)
    public List<SystemSetting> getAllSettings() {
        return settingRepository.findAll();
    }

    @Transactional(readOnly = true)
    public String getSettingValue(String key, String defaultValue) {
        return settingRepository.findBySettingKey(key)
                .map(SystemSetting::getSettingValue)
                .orElse(defaultValue);
    }

    @Transactional
    public SystemSetting updateSetting(String key, String value, String updatedBy) {
        SystemSetting setting = settingRepository.findBySettingKey(key)
                .orElseGet(() -> SystemSetting.builder()
                        .settingKey(key)
                        .category("CUSTOM")
                        .build());

        setting.setSettingValue(value);
        setting.setUpdatedBy(updatedBy != null ? updatedBy : "ADMIN");
        setting.setUpdatedAt(Instant.now());

        return settingRepository.save(setting);
    }
}

