import re
import json

def parse_llm_response(content):
    # Parse sections robustly
    metadata_data = {}
    spec_content = ""
    milestones_data = []
    
    # 1. Extract METADATA JSON
    metadata_json = "{}"
    metadata_match = re.search(r'(?:---|###|\*\*|#)*\s*METADATA\s*(?:---|###|\*\*|#)*\s*(\{.*?\})', content, re.DOTALL | re.IGNORECASE)
    if metadata_match:
        metadata_json = metadata_match.group(1).strip()
    else:
        # Fallback: find the first JSON object in the entire response
        first_obj_match = re.search(r'\{.*?\}', content, re.DOTALL)
        if first_obj_match:
            metadata_json = first_obj_match.group(0).strip()
            
    try:
        metadata_data = json.loads(re.search(r'\{.*\}', metadata_json, re.DOTALL).group())
    except Exception as e:
        metadata_data = {}

    # 2. Extract MILESTONES JSON
    milestones_json = "[]"
    milestones_match = re.search(r'(?:---|###|\*\*|#)*\s*MILESTONES\s*(?:---|###|\*\*|#)*\s*(\[.*?\])', content, re.DOTALL | re.IGNORECASE)
    if milestones_match:
        milestones_json = milestones_match.group(1).strip()
    else:
        # Fallback: find the first JSON array in the response
        first_arr_match = re.search(r'\[.*?\]', content, re.DOTALL)
        if first_arr_match:
            milestones_json = first_arr_match.group(0).strip()
            
    try:
        milestones_data = json.loads(re.search(r'\[.*\]', milestones_json, re.DOTALL).group())
    except Exception as e:
        milestones_data = []

    # 3. Extract SPEC Content
    # Use exact word boundaries and put SPECIFICATION before SPEC
    spec_section_match = re.search(r'(?:---|###|\*\*|#)*\s*(?:SPECIFICATION|SPEC|CAHIER DES CHARGES)\s*(?:---|###|\*\*|#)*\n(.*)\n(?:---|###|\*\*|#)*\s*MILESTONES', content, re.DOTALL | re.IGNORECASE)
    if spec_section_match:
        spec_content = spec_section_match.group(1).strip()
    else:
        # Try splitting on SPECIFICATION/SPEC/CAHIER DES CHARGES
        spec_split = re.split(r'(?:---|###|\*\*|#)*\s*(?:SPECIFICATION|SPEC|CAHIER DES CHARGES)\s*(?:---|###|\*\*|#)*', content, flags=re.IGNORECASE)
        if len(spec_split) > 1:
            spec_body = spec_split[1]
            milestones_split = re.split(r'(?:---|###|\*\*|#)*\s*MILESTONES\s*(?:---|###|\*\*|#)*', spec_body, flags=re.IGNORECASE)
            spec_content = milestones_split[0].strip()
        else:
            # Absolute fallback
            spec_content = content.strip()
            
    # Cleanup markdown json wrapper block if present in spec_content
    spec_content = re.sub(r'^```markdown\s*', '', spec_content, flags=re.IGNORECASE)
    spec_content = re.sub(r'\s*```$', '', spec_content)
    
    return metadata_data, spec_content, milestones_data

# Test Cases
test_1 = """
---METADATA---
{
  "project_name": "Test 1",
  "description": "Desc 1",
  "inferred_deadline_days": 45
}
---SPEC---
# Spec Title
My Spec Content
---MILESTONES---
[
  {"title": "M1", "days_from_now": 10}
]
"""

test_2 = """
Here is your analysis:

### METADATA
{
  "project_name": "Test 2",
  "description": "Desc 2",
  "inferred_deadline_days": 60
}

## SPECIFICATION
# Spec 2
Some beautiful design details.

### MILESTONES
[
  {"title": "M2", "days_from_now": 20}
]
"""

print("--- Test 1 ---")
meta, spec, miles = parse_llm_response(test_1)
print("Meta:", meta)
print("Spec:", spec)
print("Miles:", miles)

print("\n--- Test 2 ---")
meta, spec, miles = parse_llm_response(test_2)
print("Meta:", meta)
print("Spec:", spec)
print("Miles:", miles)
