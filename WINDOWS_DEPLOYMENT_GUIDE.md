# Windows Deployment Guide

## 🚀 Langkah Deployment dari Windows

### 1. Upload Files ke Server

**Pilih salah satu cara:**

#### Cara A: Menggunakan SSH Key (Recommended)
```cmd
# Double click file ini di Windows Explorer:
upload-with-key.bat
```

Atau PowerShell:
```powershell
# Buka PowerShell di folder project, lalu jalankan:
.\upload-with-key.ps1
```

#### Cara B: Manual dengan SSH Key
```cmd
# Buka Command Prompt di folder project, lalu jalankan:
scp -i DOSSHKEY -r backend/ root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY -r frontend/ root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY emergency-db-fix.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY quick-db-fix.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY force-fix-database.sh root@152.42.232.39:/opt/sales-app/
scp -i DOSSHKEY deploy-bca-mandiri-fix.sh root@152.42.232.39:/opt/sales-app/
```

#### Cara C: Tanpa SSH Key (Jika ada error permission)
```cmd
# Double click file ini di Windows Explorer:
deploy-windows.bat
```

### 2. SSH ke Server dan Fix Database

**Buka Command Prompt atau PowerShell, lalu:**

```bash
# SSH ke server dengan SSH key
ssh -i DOSSHKEY root@152.42.232.39

# Masuk ke direktori aplikasi
cd /opt/sales-app

# Jalankan emergency fix
chmod +x emergency-db-fix.sh
./emergency-db-fix.sh
```

## 🔧 Script yang Tersedia di Server

Setelah upload, di server akan tersedia:

| Script | Kapan Digunakan |
|--------|-----------------|
| `emergency-db-fix.sh` | **Paling cepat** - fix database readonly |
| `quick-db-fix.sh` | Jika emergency tidak berhasil |
| `force-fix-database.sh` | Jika quick fix tidak berhasil |
| `deploy-bca-mandiri-fix.sh` | Deploy lengkap dengan database fix |

## 📋 Troubleshooting Windows

### Error: "scp is not recognized"
- **Solution**: Install Git for Windows atau WSL
- **Alternative**: Gunakan WinSCP untuk upload manual

### Error: "ssh is not recognized"
- **Solution**: Install Git for Windows atau WSL
- **Alternative**: Gunakan PuTTY untuk SSH

### Error: "Permission denied"
- **Solution**: Pastikan SSH key sudah disetup dengan benar

## 🌐 Test Setelah Deploy

1. Buka browser
2. Kunjungi http://152.42.232.39
3. Login sebagai admin
4. Test input sales dengan BCA/Mandiri transfer

## 📞 Quick Commands

**Upload dari Windows:**
```cmd
upload-with-key.bat
```

**SSH dan Fix:**
```bash
ssh -i DOSSHKEY root@152.42.232.39
cd /opt/sales-app
chmod +x emergency-db-fix.sh
./emergency-db-fix.sh
```

**Check Status:**
```bash
pm2 status
pm2 logs sales-backend
``` 