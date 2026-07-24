#!/usr/bin/env python3
"""Register test phone in Firebase Auth Emulator using REST API."""

import requests
import json

EMULATOR_HOST = "http://127.0.0.1:9099"
PHONE = "+919876543210"
OTP_CODE = "123456"

def register_test_phone():
    """Register test phone number in emulator."""
    
    # Method 1: Try the identity toolkit endpoint
    url = f"{EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-key"
    
    payload = {
        "phoneNumber": PHONE
    }
    
    try:
        print(f"Attempting to register {PHONE}...")
        response = requests.post(url, json=payload, timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Method 2: Check emulator's local endpoint
    verify_url = f"{EMULATOR_HOST}/accounts:lookup"
    try:
        print(f"\nChecking accounts endpoint...")
        response = requests.post(verify_url, json={"phoneNumber": PHONE}, timeout=5)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    register_test_phone()
