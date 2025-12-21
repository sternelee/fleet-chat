#!/usr/bin/env python3

"""
Simple Fleet Chat Plugin Packager
Packages a plugin directory into a .fcp file
"""

import os
import json
import zipfile
import hashlib
import shutil
from datetime import datetime
from pathlib import Path

def calculate_checksum(file_path):
    """Calculate SHA256 checksum of a file"""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()

def create_plugin_metadata(manifest, build_time, fleet_chat_version="1.0.0"):
    """Create plugin metadata"""
    return {
        "manifest": manifest,
        "checksum": "",  # Will be calculated after package creation
        "buildTime": build_time,
        "fleetChatVersion": fleet_chat_version
    }

def pack_plugin(plugin_dir, output_path):
    """Package a plugin directory into a .fcp file"""
    plugin_dir = Path(plugin_dir).resolve()
    output_path = Path(output_path).resolve()

    print(f"📦 Packing plugin from {plugin_dir}")

    # Read package.json
    package_json_path = plugin_dir / "package.json"
    if not package_json_path.exists():
        raise FileNotFoundError("package.json not found in plugin directory")

    with open(package_json_path, 'r') as f:
        package_json = json.load(f)

    # Extract manifest
    manifest = {
        "name": package_json["name"],
        "version": package_json["version"],
        "description": package_json["description"],
        "author": package_json["author"],
        "icon": package_json.get("icon"),
        "commands": package_json.get("commands", []),
        "permissions": package_json.get("permissions", [])
    }

    # Create temporary directory for package contents
    temp_dir = plugin_dir / ".fleet-pack"
    if temp_dir.exists():
        shutil.rmtree(temp_dir)
    temp_dir.mkdir()

    try:
        # Copy dist directory
        dist_dir = plugin_dir / "dist"
        if dist_dir.exists():
            shutil.copytree(dist_dir, temp_dir / "dist")

        # Copy assets
        assets_dir = plugin_dir / "assets"
        if assets_dir.exists():
            shutil.copytree(assets_dir, temp_dir / "assets")

        # Copy icon if specified
        if manifest.get("icon"):
            icon_path = plugin_dir / manifest["icon"]
            if icon_path.exists():
                shutil.copy2(icon_path, temp_dir / icon_path.name)

        # Create manifest.json
        with open(temp_dir / "manifest.json", 'w') as f:
            json.dump(manifest, f, indent=2)

        # Create metadata.json
        metadata = create_plugin_metadata(manifest, datetime.now().isoformat())
        with open(temp_dir / "metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)

        # Create zip package
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(temp_dir)
                    zipf.write(file_path, arcname)

        # Calculate and update checksum
        checksum = calculate_checksum(output_path)
        metadata["checksum"] = checksum
        with open(temp_dir / "metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)

        # Recreate package with checksum
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(temp_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(temp_dir)
                    zipf.write(file_path, arcname)

        # Get file size
        file_size = os.path.getsize(output_path)

        print(f"✅ Plugin packed successfully: {output_path}")
        print(f"📊 Package size: {file_size:,} bytes ({file_size / 1024:.2f} KB)")

    finally:
        # Clean up temp directory
        if temp_dir.exists():
            shutil.rmtree(temp_dir)

if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: python package-plugin.py <plugin-dir> <output-file>")
        sys.exit(1)

    plugin_dir = sys.argv[1]
    output_path = sys.argv[2]

    try:
        pack_plugin(plugin_dir, output_path)
    except Exception as e:
        print(f"❌ Failed to pack plugin: {e}")
        sys.exit(1)