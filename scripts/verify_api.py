import sys, json
sys.path.insert(0, '.')
import urllib.request, urllib.parse

BASE = 'http://127.0.0.1:8765'
PASS_COUNT = 0
FAIL_COUNT = 0

def post(path, data, token=None):
    body = json.dumps(data).encode()
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(BASE + path, data=body, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def get(path, token=None, params=None):
    url = BASE + path
    if params:
        url += '?' + urllib.parse.urlencode(params)
    headers = {}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())

def check(name, cond, detail=''):
    global PASS_COUNT, FAIL_COUNT
    if cond:
        print('  [PASS] ' + name)
        PASS_COUNT += 1
    else:
        print('  [FAIL] ' + name + '  <- ' + str(detail))
        FAIL_COUNT += 1

# 1. Health
print('=== TEST 1: Health Check ===')
s, d = get('/health')
check('status 200', s == 200, s)
check('status ok', d.get('status') == 'ok', d)
print()

# 2. Login
print('=== TEST 2: Auth Login ===')
s, d = post('/api/v1/auth/login', {'username': '+919876543210', 'password': 'MediPulse@2024'})
check('status 200', s == 200, str(s) + ': ' + str(d))
token = d.get('access_token')
check('access_token present', bool(token))
print()

if not token:
    print('Cannot proceed without token')
    sys.exit(1)

# 3. Medicine search — warfarin
print('=== TEST 3: Medicine Search (warfarin) ===')
s, d = get('/api/v1/medicines/search', token, {'q': 'warfarin'})
check('status 200', s == 200, str(s))
total = d.get('total', 0)
items = d.get('items', [])
check('total > 0', total > 0, 'total=' + str(total))
check('items not empty', len(items) > 0)
if items:
    m = items[0]
    check('generic_name present', bool(m.get('generic_name')))
    check('brand_name present', bool(m.get('brand_name')))
    print('  Sample: generic=' + str(m.get('generic_name')) + ', brand=' + str(m.get('brand_name')))
print()

# 4. Medicine search — aspirin
print('=== TEST 4: Medicine Search (aspirin) ===')
s, d = get('/api/v1/medicines/search', token, {'q': 'aspirin'})
check('status 200', s == 200, s)
check('total > 0', d.get('total', 0) > 0, 'total=' + str(d.get('total')))
print()

# 5. Medicine by ID
print('=== TEST 5: Medicine Get by ID ===')
s, d = get('/api/v1/medicines/search', token, {'q': 'warfarin', 'limit': '1'})
if d.get('items'):
    mid = d['items'][0]['id']
    s2, d2 = get('/api/v1/medicines/' + mid, token)
    check('status 200', s2 == 200, str(s2))
    check('id matches', d2.get('id') == mid)
    check('generic_name populated', bool(d2.get('generic_name')))
    check('usage_guidelines populated', bool(d2.get('usage_guidelines')), 'None')
    print('  usage_guidelines snippet: ' + str(d2.get('usage_guidelines', ''))[:80])
else:
    check('search result for ID lookup', False, 'no warfarin found')
print()

# 6. Interaction check — known dangerous pair
print('=== TEST 6: Interaction Check Warfarin+Aspirin ===')
s, d = post('/api/v1/interactions/analyze', {
    'medicines': ['Warfarin', 'Aspirin'],
    'include_profile_context': False
}, token)
check('status 200', s == 200, str(s) + ': ' + str(d)[:200])
results = d.get('results', [])
check('results not empty', len(results) > 0)
if results:
    r = results[0]
    check('matched=True', r.get('matched') == True, r.get('matched'))
    check('severity is high', r.get('severity') == 'high', r.get('severity'))
    check('explanation present', bool(r.get('explanation')))
    check('recommendations not empty', len(r.get('recommendations', [])) > 0)
    print('  severity=' + str(r.get('severity')))
    print('  explanation: ' + str(r.get('explanation'))[:80])
check('overall_severity high', d.get('overall_severity') == 'high', d.get('overall_severity'))
print()

# 7. Interaction check — moderate pair
print('=== TEST 7: Interaction Check Metformin+Alcohol (moderate) ===')
s, d = post('/api/v1/interactions/analyze', {
    'medicines': ['Metformin', 'Fluoxetine'],
    'include_profile_context': False
}, token)
check('status 200', s == 200, str(s))
results = d.get('results', [])
check('results present', len(results) > 0)
if results:
    r = results[0]
    print('  matched=' + str(r.get('matched')) + ', severity=' + str(r.get('severity')))
print()

# 8. 3-drug combo
print('=== TEST 8: 3-drug Combo Warfarin+Ibuprofen+Aspirin ===')
s, d = post('/api/v1/interactions/analyze', {
    'medicines': ['Warfarin', 'Ibuprofen', 'Aspirin'],
    'include_profile_context': False
}, token)
check('status 200', s == 200, str(s))
result_count = len(d.get('results', []))
check('3 results for 3 pairs', result_count == 3, 'got ' + str(result_count))
check('overall_severity high', d.get('overall_severity') == 'high', d.get('overall_severity'))
for r in d.get('results', []):
    matched = 'MATCHED' if r.get('matched') else 'unmatched'
    print('  ' + str(r.get('drug_a')) + ' + ' + str(r.get('drug_b')) + ' -> ' + str(r.get('severity')) + ' [' + matched + ']')
print()

# 9. Resolved medicines returned
print('=== TEST 9: Resolved Medicines in Response ===')
s, d = post('/api/v1/interactions/analyze', {
    'medicines': ['Warfarin', 'Aspirin'],
    'include_profile_context': False
}, token)
resolved = d.get('resolved_medicines', [])
check('resolved_medicines not empty', len(resolved) > 0, 'empty')
check('2 resolved medicines', len(resolved) == 2, 'got ' + str(len(resolved)))
if resolved:
    for rm in resolved:
        matched = rm.get('matched')
        print('  ' + str(rm.get('input')) + ' -> ' + str(rm.get('resolved_name')) + ' matched=' + str(matched))
        check(str(rm.get('input')) + ' matched', matched == True, 'matched=False')
print()

# 10. Diagnostics
print('=== TEST 10: Diagnostics API ===')
s, d = get('/api/v1/diagnostics', token)
if s == 200:
    check('medicine_count > 0', d.get('medicine_count', 0) > 0, d.get('medicine_count'))
    check('interaction_count > 0', d.get('interaction_count', 0) > 0, d.get('interaction_count'))
    print('  medicine_count=' + str(d.get('medicine_count')) + ', interaction_count=' + str(d.get('interaction_count')))
else:
    print('  Diagnostics returned ' + str(s) + ': ' + str(d))
print()

print('=' * 45)
print('  RESULTS: ' + str(PASS_COUNT) + ' passed, ' + str(FAIL_COUNT) + ' failed')
print('=' * 45)
