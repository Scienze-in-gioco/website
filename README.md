# website

# Istruzioni

Prima di avviare il server è necessario creare un file di nome `db-config-<env>.json` che segua questa struttura:
```
{
  "host": "",
  "user": "",
  "password": "",
  "database": ""
}
```

nel caso di sviluppo in laboratorio il file di configurazione deve essere:
```
{
  "host": "192.168.1.231",
  "user": "scienze_gioco",
  "password": "admin",
  "database": "scienze_gioco"
}
```