import os
import re
import json
import glob

def parse_markdown(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    words = []
    
    # Split content into blocks by the number prefix, e.g., "1) 單字："
    # We use a regex that matches start of line, digits, parenthesis, optional spaces, "單字："
    blocks = re.split(r'\n\d+\)\s*單字：', content)
    
    # The first block is the header/intro, so we skip it.
    if len(blocks) > 1:
        blocks = blocks[1:]
    else:
        # Try without the number prefix if it failed
        blocks = re.split(r'\n單字：', content)
        if len(blocks) > 1:
            blocks = blocks[1:]
        else:
            return words # No words found

    for block in blocks:
        word_data = {}
        
        # 1. Parse Word and Phonetic
        # The block starts with "Word | 音標: /phonetic/"
        # e.g., "I  | 音標: /aɪ/  \n"
        first_line = block.split('\n')[0]
        
        word_match = re.search(r'^(.*?)\s*\|\s*音標:\s*(.*?)\s*$', first_line)
        if word_match:
            word_data['word'] = word_match.group(1).strip()
            word_data['phonetic'] = word_match.group(2).strip()
        else:
            # Fallback if no phonetic or different separator
            word_data['word'] = first_line.split('|')[0].strip()
            word_data['phonetic'] = ''

        # 2. Parse Meaning
        meaning_match = re.search(r'-\s*中文：(.*)', block)
        word_data['meaning'] = meaning_match.group(1).strip() if meaning_match else ""
        
        # 3. Parse Example
        example_match = re.search(r'-\s*例句：(.*)', block)
        word_data['example'] = example_match.group(1).strip() if example_match else ""

        # 4. Parse Hint
        hint_match = re.search(r'-\s*記憶提示：(.*)', block)
        word_data['hint'] = hint_match.group(1).strip() if hint_match else ""

        # 5. Parse Pronunciation Tip (can be 發音要點 or 發音要點與練習)
        pron_match = re.search(r'-\s*發音要點.*?：(.*)', block)
        word_data['pronunciation'] = pron_match.group(1).strip() if pron_match else ""

        # Only add if we actually found a word
        if word_data['word']:
            words.append(word_data)

    return words

def main():
    # Workspace root is d:\英文\全球化英文
    # Lessons folder is d:\英文\全球化英文\lessons
    lessons_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'lessons')
    
    md_files = glob.glob(os.path.join(lessons_dir, '*詳細學習.md'))
    
    print(f"Found {len(md_files)} markdown files.")
    
    for md_file in md_files:
        filename = os.path.basename(md_file)
        # Extract Day number, e.g. "Day1_詳細學習.md" -> "Day1"
        day_match = re.search(r'(Day\d+)', filename, re.IGNORECASE)
        if not day_match:
            continue
            
        day_str = day_match.group(1)
        
        words = parse_markdown(md_file)
        print(f"Parsed {len(words)} words from {filename}")
        
        if words:
            json_filename = f"{day_str}.json"
            json_filepath = os.path.join(lessons_dir, json_filename)
            
            with open(json_filepath, 'w', encoding='utf-8') as f:
                json.dump(words, f, ensure_ascii=False, indent=2)
            print(f"  -> Saved {json_filepath}")

if __name__ == '__main__':
    main()
