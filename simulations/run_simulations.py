#!/usr/bin/env python3
"""
CHRONOS Protocol - Economic Simulations Runner

This script executes all Jupyter notebooks and generates output reports.
"""

import os
import sys
import subprocess
from pathlib import Path

def check_dependencies():
    """Check if required packages are installed."""
    try:
        import jupyter
        import numpy
        import pandas
        import matplotlib
        import seaborn
        import plotly
        print("✅ All dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("\nPlease install dependencies:")
        print("  pip install -r requirements.txt")
        return False

def run_notebook(notebook_path):
    """Execute a Jupyter notebook."""
    print(f"\n{'='*60}")
    print(f"Running: {notebook_path.name}")
    print(f"{'='*60}\n")
    
    try:
        # Convert notebook to HTML with execution
        output_path = notebook_path.parent.parent / "outputs" / f"{notebook_path.stem}.html"
        output_path.parent.mkdir(exist_ok=True)
        
        cmd = [
            "jupyter", "nbconvert",
            "--to", "html",
            "--execute",
            "--output", str(output_path.absolute()),
            str(notebook_path.absolute())
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode == 0:
            print(f"✅ Successfully executed: {notebook_path.name}")
            print(f"   Output saved to: {output_path}")
            return True
        else:
            print(f"❌ Error executing: {notebook_path.name}")
            print(f"   {result.stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Exception while running {notebook_path.name}: {e}")
        return False

def main():
    """Main execution function."""
    print("""
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║         CHRONOS Protocol - Economic Simulations           ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝
    """)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Get notebook directory
    script_dir = Path(__file__).parent
    notebooks_dir = script_dir / "notebooks"
    
    if not notebooks_dir.exists():
        print(f"❌ Notebooks directory not found: {notebooks_dir}")
        sys.exit(1)
    
    # Find all notebooks
    notebooks = sorted(notebooks_dir.glob("*.ipynb"))
    
    if not notebooks:
        print(f"❌ No notebooks found in: {notebooks_dir}")
        sys.exit(1)
    
    print(f"\nFound {len(notebooks)} notebook(s) to execute:\n")
    for i, nb in enumerate(notebooks, 1):
        print(f"  {i}. {nb.name}")
    
    print("\n" + "="*60)
    
    # Execute each notebook
    results = {}
    for notebook in notebooks:
        success = run_notebook(notebook)
        results[notebook.name] = success
    
    # Print summary
    print("\n" + "="*60)
    print("EXECUTION SUMMARY")
    print("="*60 + "\n")
    
    success_count = sum(results.values())
    total_count = len(results)
    
    for notebook_name, success in results.items():
        status = "✅ SUCCESS" if success else "❌ FAILED"
        print(f"{status:12} - {notebook_name}")
    
    print(f"\n{'='*60}")
    print(f"Total: {success_count}/{total_count} notebooks executed successfully")
    print(f"{'='*60}\n")
    
    if success_count == total_count:
        print("🎉 All simulations completed successfully!")
        print(f"\nOutputs saved to: {script_dir / 'outputs'}")
        return 0
    else:
        print("⚠️  Some simulations failed. Please check the errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

