#!/usr/bin/env python3
"""
gerar_backup.py — RPG Life OS / Shadow Slave
=============================================
Copia todos os arquivos do projeto para um diretório de backup datado.

Uso:
    python gerar_backup.py                   # backup da pasta atual
    python gerar_backup.py "D:/outro/caminho" # backup de outro diretório

O backup é gerado em:
    <dir_projeto>/backups/backup-YYYY-MM-DD_HH-MM/
"""

import os
import sys
import shutil
import datetime

# ============================================================
#   CONFIGURAÇÃO
# ============================================================

# Pastas que NÃO entram no backup (node_modules, .git, backups antigos, etc.)
EXCLUDE_DIRS = {
    'node_modules',
    '.git',
    '__pycache__',
    'backups',          # evitar backup aninhado
    '.cache',
    'dist',
    'build',
    '.venv',
    'venv',
}

# Extensões excluídas (arquivos binários grandes desnecessários)
EXCLUDE_EXTENSIONS = {
    '.pyc', '.pyo',
    '.log',
}

# ============================================================
#   HELPERS
# ============================================================

def format_size(num_bytes: int) -> str:
    """Retorna tamanho legível."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if num_bytes < 1024:
            return f"{num_bytes:.1f} {unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f} TB"


def copiar_projeto(origem: str, destino: str) -> tuple[int, int]:
    """
    Copia recursivamente `origem` → `destino`,
    ignorando pastas e extensões excluídas.

    Retorna (arquivos_copiados, bytes_totais).
    """
    count  = 0
    total  = 0

    for root, dirs, files in os.walk(origem):
        # Remover dirs excluídos (in-place filtra o walk)
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]

        # Caminho relativo à origem
        rel_root = os.path.relpath(root, origem)

        for filename in files:
            ext = os.path.splitext(filename)[1].lower()
            if ext in EXCLUDE_EXTENSIONS:
                continue

            src_path = os.path.join(root, filename)
            dst_dir  = os.path.join(destino, rel_root)
            dst_path = os.path.join(dst_dir, filename)

            os.makedirs(dst_dir, exist_ok=True)

            shutil.copy2(src_path, dst_path)  # preserva metadados
            size = os.path.getsize(src_path)
            count += 1
            total += size
            print(f"  ✔  {os.path.join(rel_root, filename):<60}  {format_size(size)}")

    return count, total


# ============================================================
#   MAIN
# ============================================================

def main():
    # Diretório de origem: argumento ou pasta do script
    if len(sys.argv) > 1:
        origem = os.path.abspath(sys.argv[1])
    else:
        origem = os.path.dirname(os.path.abspath(__file__))

    if not os.path.isdir(origem):
        print(f"❌  Diretório não encontrado: {origem}")
        sys.exit(1)

    # Nome do backup com timestamp
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
    backup_dir_name = f"backup-{timestamp}"
    destino = os.path.join(origem, "backups", backup_dir_name)

    print("=" * 70)
    print("  ⚔️  RPG Life OS — GERADOR DE BACKUP")
    print("=" * 70)
    print(f"  Origem  : {origem}")
    print(f"  Destino : {destino}")
    print(f"  Timestamp: {timestamp}")
    print("-" * 70)

    os.makedirs(destino, exist_ok=True)

    try:
        arquivos, bytes_total = copiar_projeto(origem, destino)
    except Exception as e:
        print(f"\n❌  Erro durante o backup: {e}")
        sys.exit(1)

    print("-" * 70)
    print(f"  ✅  Backup concluído!")
    print(f"      Arquivos copiados : {arquivos}")
    print(f"      Tamanho total     : {format_size(bytes_total)}")
    print(f"      Salvo em          : {destino}")
    print("=" * 70)

    # Salvar manifesto do backup
    manifesto_path = os.path.join(destino, "BACKUP_MANIFEST.txt")
    with open(manifesto_path, "w", encoding="utf-8") as f:
        f.write(f"RPG Life OS — Backup Manifesto\n")
        f.write(f"Gerado em   : {datetime.datetime.now().isoformat()}\n")
        f.write(f"Origem      : {origem}\n")
        f.write(f"Arquivos    : {arquivos}\n")
        f.write(f"Tamanho     : {format_size(bytes_total)}\n")
        f.write(f"Fase atual  : Pré-Refatoração Shadow Slave (Phase 4)\n")

    print(f"\n  📄  Manifesto salvo: BACKUP_MANIFEST.txt")
    print()


if __name__ == "__main__":
    main()
