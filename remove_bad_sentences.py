"""
Script to remove sentences containing untranslated Vietnamese phrase "cảm thấy không khỏe"
"""

def clean_file(input_file, output_file):
    """Remove sentence pairs containing 'cảm thấy không khỏe' in Japanese translation"""
    
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    cleaned_lines = []
    i = 0
    removed_count = 0
    
    while i < len(lines):
        line = lines[i]
        
        # Check if this is a numbered VI line (format: "13. VI: ...")
        if '. VI:' in line and line.strip()[0].isdigit():
            # Get the JP line (next line should start with spaces and "JP:")
            jp_line = None
            if i + 1 < len(lines):
                next_line = lines[i + 1]
                if next_line.strip().startswith('JP:'):
                    jp_line = next_line
            
            # Check if VI line contains phrase to remove
            if 'cảm thấy không khỏe' in line:
                # Skip both VI and JP lines
                removed_count += 1
                print(f"Removing: {line.strip()}")
                i += 2  # Skip VI and JP lines
                continue
        
        # Keep this line
        cleaned_lines.append(line)
        i += 1
    
    # Write cleaned content
    with open(output_file, 'w', encoding='utf-8') as f:
        f.writelines(cleaned_lines)
    
    print(f"\n✓ Removed {removed_count} sentence pairs from {input_file}")
    print(f"✓ Saved cleaned file to {output_file}")
    
    return removed_count

if __name__ == '__main__':
    # Clean N3-N4 file from backup
    cleaned = clean_file(
        '1000_cap_cau_Viet_Nhat_N3_N4_backup.txt',
        '1000_cap_cau_Viet_Nhat_N3_N4.txt'
    )
    
    print(f"\n✓ Total removed from N3-N4: {cleaned} sentence pairs")
