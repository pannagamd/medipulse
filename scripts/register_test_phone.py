#!/usr/bin/env python3
"""Register test phone number in Firebase Auth Emulator."""

import os
os.environ['FIREBASE_AUTH_EMULATOR_HOST'] = '127.0.0.1:9099'

import firebase_admin
from firebase_admin import auth

try:
    firebase_admin.initialize_app()
    user = auth.create_user(phone_number='+919876543210')
    print(f'✅ Test user created successfully!')
    print(f'   Phone: +919876543210')
    print(f'   UID: {user.uid}')
except firebase_admin.exceptions.AlreadyExistsError:
    print('✅ Test user already exists')
except Exception as e:
    print(f'❌ Error: {e}')
