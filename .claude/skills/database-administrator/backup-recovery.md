# Backup and Recovery Guide

## Overview

Best practices for database backup and recovery strategies.

---

## Backup Types

### Full Backup
Complete copy of entire database.

```bash
# PostgreSQL
pg_dump -Fc mydb > backup_full_$(date +%Y%m%d).dump

# MySQL
mysqldump --all-databases > backup_full_$(date +%Y%m%d).sql
```

### Incremental Backup
Only changes since last backup.

```bash
# PostgreSQL with WAL archiving
archive_command = 'cp %p /backup/wal/%f'

# MySQL with binary logs
mysqlbinlog --start-datetime="2024-01-01 00:00:00" binlog.000001 > incremental.sql
```

### Differential Backup
All changes since last full backup.

---

## Backup Strategies

### 3-2-1 Rule

- **3** copies of data
- **2** different storage types
- **1** offsite location

### Retention Policy

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full | Weekly | 4 weeks |
| Differential | Daily | 1 week |
| WAL/Binlog | Continuous | 2 weeks |

---

## PostgreSQL Backup

### pg_dump (Logical)

```bash
# Custom format (recommended)
pg_dump -Fc -f backup.dump mydb

# Plain SQL
pg_dump -f backup.sql mydb

# Parallel backup (large databases)
pg_dump -Fc -j 4 -f backup.dump mydb

# Specific tables
pg_dump -t users -t orders mydb > tables.sql
```

### pg_basebackup (Physical)

```bash
# Full cluster backup
pg_basebackup -D /backup/base -Ft -z -Xs -P

# With WAL streaming
pg_basebackup -D /backup/base -Ft -z -Xs -P -c fast
```

### Continuous Archiving (PITR)

```conf
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /backup/wal/%f'
```

---

## MySQL Backup

### mysqldump (Logical)

```bash
# All databases
mysqldump --all-databases --single-transaction > backup.sql

# Specific database
mysqldump --single-transaction mydb > mydb.sql

# With routines and triggers
mysqldump --routines --triggers mydb > mydb.sql
```

### Percona XtraBackup (Physical)

```bash
# Full backup
xtrabackup --backup --target-dir=/backup/full

# Incremental backup
xtrabackup --backup --target-dir=/backup/inc1 \
  --incremental-basedir=/backup/full

# Prepare for restore
xtrabackup --prepare --target-dir=/backup/full
```

---

## Automated Backup Script

```bash
#!/bin/bash
# backup.sh

set -e

# Configuration
DB_NAME="mydb"
BACKUP_DIR="/backup"
RETENTION_DAYS=7
S3_BUCKET="s3://my-backups"

# Date for filename
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${DATE}.dump"

# Create backup
echo "Starting backup..."
pg_dump -Fc "${DB_NAME}" > "${BACKUP_FILE}"

# Compress if needed
gzip "${BACKUP_FILE}"
BACKUP_FILE="${BACKUP_FILE}.gz"

# Verify backup
if [ ! -s "${BACKUP_FILE}" ]; then
  echo "ERROR: Backup file is empty!"
  exit 1
fi

# Upload to S3
echo "Uploading to S3..."
aws s3 cp "${BACKUP_FILE}" "${S3_BUCKET}/"

# Cleanup old backups
echo "Cleaning up old backups..."
find "${BACKUP_DIR}" -name "*.dump.gz" -mtime +${RETENTION_DAYS} -delete

echo "Backup completed: ${BACKUP_FILE}"
```

---

## Recovery Procedures

### PostgreSQL Restore

```bash
# From custom format
pg_restore -d mydb backup.dump

# Create new database and restore
createdb mydb_restored
pg_restore -d mydb_restored backup.dump

# From SQL file
psql mydb < backup.sql

# Point-in-time recovery
pg_restore -d mydb backup.dump
# Then apply WAL files to target time
recovery_target_time = '2024-01-15 12:00:00'
```

### MySQL Restore

```bash
# From SQL file
mysql mydb < backup.sql

# With XtraBackup
xtrabackup --copy-back --target-dir=/backup/full
chown -R mysql:mysql /var/lib/mysql
```

---

## Recovery Testing

### Monthly Recovery Drill

```markdown
# Recovery Test Checklist

## Preparation
- [ ] Identify test environment
- [ ] Get latest backup
- [ ] Document start time

## Restore
- [ ] Restore database
- [ ] Apply incremental backups
- [ ] Verify data integrity

## Validation
- [ ] Count records in key tables
- [ ] Run application tests
- [ ] Verify recent transactions

## Documentation
- [ ] Record recovery time
- [ ] Note any issues
- [ ] Update runbook
```

### RTO/RPO Calculation

| Metric | Definition | Target |
|--------|------------|--------|
| RTO | Recovery Time Objective | < 1 hour |
| RPO | Recovery Point Objective | < 15 min |

---

## Disaster Recovery Plan

```markdown
# Disaster Recovery Runbook

## Scenario 1: Database Corruption

1. Identify corruption scope
2. Stop application writes
3. Restore from latest backup
4. Apply WAL/binlog to point before corruption
5. Verify data integrity
6. Resume operations

## Scenario 2: Complete Server Loss

1. Provision new server
2. Install database software
3. Restore from offsite backup
4. Apply incremental backups
5. Update connection strings
6. Verify and resume

## Scenario 3: Accidental Data Deletion

1. Stop further writes if possible
2. Identify deletion time
3. Restore to point-in-time before deletion
4. Extract deleted data
5. Merge back to production
```

---

## Backup Monitoring

### Metrics to Track

```yaml
metrics:
  - name: backup_last_success_timestamp
    type: gauge
    help: "Timestamp of last successful backup"
    
  - name: backup_duration_seconds
    type: histogram
    help: "Backup duration in seconds"
    
  - name: backup_size_bytes
    type: gauge
    help: "Size of latest backup"
```

### Alerts

```yaml
alerts:
  - alert: BackupMissing
    expr: time() - backup_last_success_timestamp > 86400
    for: 1h
    severity: critical
    annotations:
      summary: "No successful backup in 24 hours"
      
  - alert: BackupTooSmall
    expr: backup_size_bytes < backup_size_bytes offset 1d * 0.5
    for: 5m
    severity: warning
    annotations:
      summary: "Backup size decreased significantly"
```

---

## Checklist

### Daily
- [ ] Verify backup completed
- [ ] Check backup size
- [ ] Review backup logs

### Weekly
- [ ] Test restore to dev
- [ ] Verify offsite replication
- [ ] Check retention policy

### Monthly
- [ ] Full recovery drill
- [ ] Update RTO/RPO metrics
- [ ] Review backup strategy
