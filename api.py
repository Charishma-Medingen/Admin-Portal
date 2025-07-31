from flask import Flask, request, jsonify, make_response, Response, redirect
from flask_jwt_extended import JWTManager, jwt_required
from flask_cors import CORS
import pymysql
import hashlib
import secrets
from functools import wraps
import jwt
import json
from datetime import datetime,date
import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError
import random
from datetime import datetime, timedelta
import razorpay
from collections import Counter
import requests
import re
import traceback
from decimal import Decimal
import hmac
import hashlib
import math
from datetime import time
from botocore.client import Config
from datetime import timezone
import mysql.connector
from mysql.connector import Error
import os

app = Flask(__name__)
CORS(app)
# MySQL Configuration

# ---------- Config placeholders ----------
app.config['MYSQL_HOST'] = '<MYSQL_HOST>'
app.config['MYSQL_USER'] = '<MYSQL_USER>'
app.config['MYSQL_PASSWORD'] = '<MYSQL_PASSWORD>'
app.config['MYSQL_DB'] = '<MYSQL_DATABASE>'
app.config['SECRET_KEY'] = '<SECRET_KEY>'


# ---------- AWS S3 (optional) ----------
s3_client = boto3.client('s3', region_name='ap-south-1', config=Config(signature_version='s3v4'))
BUCKET_NAME = '<BUCKET_NAME>'


redirect_map = None


def get_mysql_connection():
    return pymysql.connect(
        host=app.config['MYSQL_HOST'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD'],
        db=app.config['MYSQL_DB'],
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/api/health', methods=['GET', 'POST'])
def health():
        return jsonify({'success': "success", "region": "ap-south-1"}), 200



def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None

        # Check if 'Authorization' header is present
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split()[1]

        if not token:
            return jsonify({'error': 'Token is missing'}), 401

        try:
            # Decode the JWT token
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])

            if "user" in data.keys():
                current_user = data['user']
                connection = get_mysql_connection()
                with connection.cursor() as cursor:
                    cursor.execute("SELECT * FROM AdminUsers WHERE user_id = %s", (current_user,))
                    admin_user = cursor.fetchone()
                connection.close()

                if not admin_user:
                    return jsonify({'message': 'Admin user not found!'}), 403  # Forbidden

                # Check if the request has a customer query parameter
                print(request.args)
                customer_id = request.args.get('customer')
                if customer_id:
                    # Return the customer_id instead of admin_user if present
                    print("in to", customer_id)
                    current_user = customer_id

            elif "customer_id" in data.keys():
                current_user = data['customer_id']
                
        except Exception as e:
            print(e)
            return jsonify({'error': 'Token is invalid'}), 401

        return f(current_user, *args, **kwargs)

    return decorated


def create_notification_to_admin(sender, notification_message, action_url, noti_type="info"):
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Get all admin users
            # cursor.execute("SELECT * FROM AdminUsers")
            # admins = cursor.fetchall()

            # Insert notifications for each admin
            for admin in ["1011", "1012"]:
                insert_query = """
                    INSERT INTO Notifications (notification_receiver, notification_message, notification_sender, action_url, noti_type)
                    VALUES (%s, %s, %s, %s, %s)
                """
                cursor.execute(insert_query, (admin, notification_message, sender, action_url, noti_type))
            mysql.commit()

            for admin in ["1011", "1012"]:
                cursor.execute("SELECT endpoint, p256dh, auth FROM PushSubscriptions WHERE user_id = %s", (admin,))
                subscriptions = cursor.fetchall()

                for subscription in subscriptions:
                    api_data = {
                        "payload": {
                            "title": "Medingen",
                            "body": notification_message,
                            "icon": "/android-chrome-192x192.png",
                            "target_url": action_url
                        },
                        "subscription": subscription,
                        "schedule_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                    }

                    api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/send_notification_247832438"
                    response = requests.post(api_url, json=api_data)

    except Exception as e:
        print(traceback.format_exc())
    finally:
        mysql.close()


@app.route('/api/create_order', methods=['POST'])
def create_order():
    data = request.get_json()
    amount = data["total_amount"]

    api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/rzp_453432sxw?total_amount={amount*100}"
    response = requests.get(api_url)

    if response.status_code != 200:
        return jsonify({'message': 'Failed to create payment order'}), 500
    else:
        response_dict = response.json()
        rzp_order_id = response_dict.get("id")

        order_response = Response(
            response.content,
            status=response.status_code,
            content_type=response.headers.get('Content-Type')
        )        

    mysql = get_mysql_connection()
    try:
        data = request.get_json()
        coupon_savings = data.get("coupon_savings", 0)
        cart_id = data.get("cart_id", "")


        with mysql.cursor() as cursor:
            # Update cart with new quantities
            update_query = """
                UPDATE Cart
                SET rzp_order_id = %s, coupon_savings = %s
                WHERE cart_id = %s 
            """
            cursor.execute(update_query, (rzp_order_id, coupon_savings, cart_id))
            mysql.commit()

        return order_response
        # return jsonify({"message": "success"}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to update cart'}), 500
    finally:
        mysql.close()


@app.route('/api/verify_payment', methods=['POST'])
def verify_payment():
    try:
        # Retrieve raw payload and Razorpay signature
        payload = request.data  # Raw payload from Razorpay
        print("payload: ", payload)
        razorpay_signature = request.headers.get('X-Razorpay-Signature')

        if not razorpay_signature:
            return jsonify({"error": "Missing Razorpay signature"}), 400

        # Compute the expected signature using HMAC-SHA256
        generated_signature = hmac.new(
            RAZORPAY_SECRET.encode(),  # Use your webhook secret
            payload,
            hashlib.sha256
        ).hexdigest()

        # Securely compare the signatures
        if not hmac.compare_digest(generated_signature, razorpay_signature):
            return jsonify({"status": "failure", "message": "Invalid signature"}), 400

        # Parse payload as JSON to extract payment details
        payload_json = json.loads(payload)

        # Extract payment_id, order_id, and other relevant data
        payment_id = payload_json.get("payload", {}).get("payment", {}).get("entity", {}).get("id")
        order_id = payload_json.get("payload", {}).get("payment", {}).get("entity", {}).get("order_id")
        signature = razorpay_signature

        if not payment_id or not order_id:
            return jsonify({"status": "failure", "message": "Missing payment_id or order_id"}), 400

        mysql = get_mysql_connection()
        try:
            with mysql.cursor() as cursor:
                # Update cart with new quantities
                update_query = """
                    UPDATE Cart
                    SET cart_status = 'payment', payment_id = %s, payment_sign = %s
                    WHERE rzp_order_id = %s 
                """
                cursor.execute(update_query, (payment_id, signature, order_id))
                mysql.commit()
                
                # get actual order id and delivery addresss
                select_query = "SELECT c.cart_id as cart_id, c.customer_id as customer_id, d.name as name, d.address1 as address1, d.pincode as pincode, d.state as state, d.phone_number as phone  FROM Cart c LEFT JOIN Addresses d ON c.delivery_address_id = d.id WHERE c.rzp_order_id = %s "
                cursor.execute(select_query, (order_id,))
                cart = cursor.fetchone()
                if cart:
                    actual_order_id = cart["cart_id"]
                    destination_details = {
                        "name": cart["name"],
                        "phone": cart["phone"],
                        "alternate_phone": "+916381975763",
                        "address_line_1": cart["address1"],
                        "address_line_2": "",
                        "pincode": cart["pincode"],
                        "city": "Chennai",
                        "state": cart["state"],
                    }
                    
                    courier_reference_number = place_courier_order(actual_order_id, destination_details)
                    update_query = """

                        UPDATE Cart
                        SET order_tracking_id = %s
                        WHERE cart_id = %s
                    """
                    cursor.execute(update_query, (courier_reference_number, actual_order_id))
                    mysql.commit()
                    
            create_notification_to_admin(cart["customer_id"], f"New payment received for order {cart["cart_id"]}", f"/admin/customer_detail/{cart["customer_id"]}", "payment")

        except Exception as e:
            print(e)
            return jsonify({'message': 'Failed to update cart'}), 500
        finally:
            mysql.close()


        return jsonify({
            "status": "success",
            "message": "Webhook verified successfully",
            "data": {
                "payment_id": payment_id,
                "order_id": order_id,
                "signature": signature
            }
        }), 200

    except Exception as e:
        # Handle unexpected errors
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/check_payment', methods=['POST'])
def check_payment():
    try:
        # Extract data from the request body
        data = request.json
        cart_id = data.get('cart_id')
        razorpay_order_id = data.get('razorpay_order_id')
        razorpay_payment_id = data.get('razorpay_payment_id')

        # Check for missing fields
        if not all([cart_id, razorpay_order_id, razorpay_payment_id]):
            return jsonify({"status": "failure", "message": "Missing required fields"}), 400
        

        mysql = get_mysql_connection()
        try:
            with mysql.cursor() as cursor:
                # Update cart with new quantities
                update_query = """
                    SELECT * FROM Cart
                    WHERE  payment_id = %s AND rzp_order_id = %s AND cart_id = %s
                """
                cursor.execute(update_query, (razorpay_payment_id, razorpay_order_id, cart_id))
                payment = cursor.fetchall()
                print(update_query, razorpay_payment_id, razorpay_order_id, cart_id, payment)
                if not payment:
                    return jsonify({"status": "failure", "message": "Payment not found"}), 404
                else:
                    return jsonify({"status": "success", "message": "Payment found"}), 200

        except Exception as e:
            print(e)
            return jsonify({'message': 'Payment not found'}), 500
        finally:
            mysql.close()


    except Exception as e:
        # Handle unexpected errors
        return jsonify({"status": "error", "message": str(e)}), 500


def generate_random_digits(n):
    """Generate a random number with n digits."""
    return ''.join(["{}".format(random.randint(0, 9)) for num in range(0, n)])

# @app.route('/api/generate_presigned_url', methods=['GET'])
# @token_required
# def generate_presigned_url(current_user):
#     try:
#         file_name = request.args.get('file_name')
#         prefix = request.args.get("prefix")
#         random_str = request.args.get("random", "true").lower()
#         random_gen = random_str in ["true", "1", "yes"]

#         if not file_name:
#             return jsonify({'error': 'File name is required'}), 400

#         if random_gen:
#             random_number = generate_random_digits(5)
#             file_name = random_number + "_" + file_name

#         # Generate a presigned URL for the S3 bucket
#         presigned_url = s3_client.generate_presigned_url(
#             'put_object',
#             Params={
#                 'Bucket': BUCKET_NAME,
#                 'Key': prefix + "/" + file_name,
#                 'ContentType': request.args.get('content_type', 'application/octet-stream')            },
#             ExpiresIn=3600  # URL expiration time in seconds
#         )

#         return jsonify({'presigned_url': presigned_url, "file_name": file_name}), 200
#     except NoCredentialsError:
#         return jsonify({'error': 'Credentials not available'}), 500
#     except PartialCredentialsError:
#         return jsonify({'error': 'Incomplete credentials provided'}), 500
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500


@app.route('/api/generate_presigned_url', methods=['GET'])
@token_required
def generate_presigned_url(current_user):
    try:
        file_name = request.args.get('file_name')
        prefix = request.args.get("prefix")
        random_str = request.args.get("random", "true").lower()
        random_gen = random_str in ["true", "1", "yes"]

        if not file_name:
            return jsonify({'error': 'File name is required'}), 400

        if random_gen:
            random_number = generate_random_digits(5)
            file_name = random_number + "_" + file_name

        # COMMENTED OUT: S3 upload disabled for production without credentials
        # presigned_url = s3_client.generate_presigned_url(
        #     'put_object',
        #     Params={
        #         'Bucket': BUCKET_NAME,
        #         'Key': prefix + "/" + file_name,
        #         'ContentType': request.args.get('content_type', 'application/octet-stream')
        #     },
        #     ExpiresIn=3600
        # )

        # RETURN dummy presigned URL (optional, for frontend compatibility)
        dummy_url = f"https://dummy-url.local/{prefix}/{file_name}"

        return jsonify({'presigned_url': dummy_url, "file_name": file_name}), 200

    # COMMENTED OUT: S3-specific errors
    # except NoCredentialsError:
    #     return jsonify({'error': 'Credentials not available'}), 500
    # except PartialCredentialsError:
    #     return jsonify({'error': 'Incomplete credentials provided'}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route("/api/save_prescription", methods=["POST"])
@token_required
def save_prescription(current_user):
    try:
        # Step 1: Extract data
        data = request.get_json()
        prescription_image_url = data.get("prescription_image_url")
        prescription_date = data.get("prescription_date")
        customer_id = data.get("customer_id")

        # Step 2: Validate required fields
        if not all([prescription_image_url, prescription_date, customer_id]):
            return jsonify({"status": "failure", "message": "Missing required fields"}), 400

        last_used_date = data.get("last_used_date") or date.today().isoformat()

        # Step 3: Get MySQL connection
        mysql = get_mysql_connection()
        try:
            with mysql.cursor() as cursor:
                insert_query = """
                INSERT INTO prescription (
                    prescription_image_url,
                    prescription_date,
                    prescription_status,
                    prescription_comments,
                    customer_id,
                    last_used_date,
                    prescription_name,
                    associated_products
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """

                values = (
                    prescription_image_url,
                    prescription_date,
                    data.get("prescription_status", "uploaded"),
                    data.get("prescription_comments", ""),
                    customer_id,
                    last_used_date,
                    data.get("prescription_name", ""),
                    data.get("associated_products", "")
                )

                print("Running Insert:", insert_query)
                print("With values:", values)

                cursor.execute(insert_query, values)
                mysql.commit()

                return jsonify({"status": "success", "message": "Prescription saved successfully"}), 200

        except Exception as e:
            print("Database Execution Error:", e)
            return jsonify({"status": "error", "message": "Failed to save prescription"}), 500
        finally:
            mysql.close()

    except Exception as e:
        print("Unexpected Error:", e)
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route("/api/googleauthsignup", methods=["POST"])
def googleauthsignup():
    data = request.json
    phone_number = data.get('phone_number')
    token = data.get("token")
    otp = data.get('otp')

    # Connect to the database
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Verify OTP and retrieve user details
            query = """
                SELECT customer_id, customer_name
                FROM Customers 
                WHERE phonenumber = %s AND otp = %s
            """
            cursor.execute(query, (phone_number, otp))
            user = cursor.fetchone()

            if not user:
                return jsonify({'error': 'Phone number or OTP invalid'}), 404
            
            api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/googleauth_452343"
            response = requests.post(api_url, json={"token": token})

            # Check if the request was successful
            if response.status_code == 200:
                resp = response.json()
                
                user_id = resp["sub"]
                email = resp["email"]
                name = resp["name"]
                picture = resp["picture"]

            # Update the password
            update_query = "UPDATE Customers SET google_auth = %s, email = %s, customer_name = %s, profile_picture = %s WHERE customer_id = %s"
            cursor.execute(update_query, (user_id, email ,name, picture, user['customer_id']))
            mysql.commit()

            return jsonify({'message': 'Login updated successfully', "customer_name": name}), 200

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

    finally:
        # Ensure the database connection is properly closed
        mysql.close()

@app.route("/api/googleauth", methods=["POST"])
def google_auth():
    token = request.get_json().get("token")
    
    try:
        api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/googleauth_452343"
        response = requests.post(api_url, json={"token": token})

        # Check if the request was successful
        if response.status_code == 200:
            resp = response.json()
            
            user_id = resp["sub"]
            email = resp["email"]
            name = resp["name"]
            picture = resp["picture"]

                # Query database to verify credentials
            mysql = get_mysql_connection()
            with mysql.cursor() as cursor:
                query = "SELECT * FROM Customers WHERE email = %s AND google_auth = %s"
                cursor.execute(query, (email,user_id))
                user = cursor.fetchone()

                if user:
                    # Update last login date
                    update_query = "UPDATE Customers SET last_login_date = %s WHERE customer_id = %s"
                    cursor.execute(update_query, (datetime.now(), user['customer_id']))
                    mysql.commit()

                    # Generate JWT token
                    token = jwt.encode({'customer_id': user['customer_id']}, app.config['SECRET_KEY'], algorithm="HS256")
                    
                    return jsonify({
                        'token': token,
                        'customer_id': user['customer_id'],
                        'customer_name': user['customer_name'],
                        'email': user['email']
                    }), 200
                else:
                    return jsonify({'error': 'User not signed up via google'}), 401
        else:
            return jsonify({"error": "Failed to authenticate user"}), 400

    except Exception as e:
        return jsonify({"error": str(e)}), 400



@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    hashed_password = data.get('hashedPassword')  

    # Query database to verify credentials
    mysql = get_mysql_connection()
    with mysql.cursor() as cursor:
        query = "SELECT * FROM AdminUsers WHERE username = %s AND password_hash = %s"
        cursor.execute(query, (username, hashed_password))
        user = cursor.fetchone()

        if user:
            update_query = "UPDATE AdminUsers SET last_login_date = %s WHERE user_id = %s"
            cursor.execute(update_query, (datetime.now(), user['user_id']))
            mysql.commit()
            token = jwt.encode({'user': user["user_id"]}, app.config['SECRET_KEY'], algorithm="HS256")
            return jsonify({'token': token, 'username': user["username"], 'email': user["email"]}), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    data = request.get_json()
    user_id = current_user
    current_password = data.get('current_password')  # Assuming frontend sends hashed current password
    new_password = data.get('new_password')  # Assuming frontend sends hashed new password

    mysql = get_mysql_connection()

    # Verify current password
    with mysql.cursor() as cursor:
        query = "SELECT * FROM AdminUsers WHERE user_id = %s AND password_hash = %s"
        cursor.execute(query, (user_id, current_password))
        user = cursor.fetchone()

        if not user:
            return jsonify({'error': 'Invalid current password'}), 401

    # Update password in database
    with mysql.cursor() as cursor:
        query = "UPDATE AdminUsers SET password_hash = %s WHERE user_id = %s"
        cursor.execute(query, (new_password, user_id))
        mysql.commit()

    return jsonify({'message': 'Password changed successfully'}), 200

@app.route('/api/cart_count', methods=['GET'])
@token_required
def getCartCount(customer_id):
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            select_query = "SELECT product_ids_qty FROM Cart WHERE customer_id = %s AND cart_status IN ('active', 'pending_confirm','confirm')"
            cursor.execute(select_query, (customer_id,))
            result = cursor.fetchone()

            if result:
                product_ids_qty = result["product_ids_qty"]
            else:
                product_ids_qty = ""

            cart_items = product_ids_qty.split(';')

            # Remove empty strings
            cart_items = [item for item in cart_items if item]

            # Use a Counter to aggregate quantities of the same product_id
            product_counter = Counter()
            
            for item in cart_items:
                product_id, quantity = item.split(':')
                product_counter[product_id] += int(quantity)
            
            combined_cart_items = ";".join([f"{product_id}:{quantity}" for product_id, quantity in product_counter.items()])


        return jsonify({'message': 'Cart details', "cart_items": combined_cart_items }), 200
    except Exception as e:
        raise e
    finally:
        mysql.close()

@app.route('/api/update_delivery_address', methods=['POST'])
@token_required
def update_delivery_address(customer_id):
    mysql = get_mysql_connection()
    try:
        data = request.get_json()
        address_id = data.get('address_id')
        cart_id = data.get("cart_id", "cart_id")

        if not address_id:
            return jsonify({'message': 'Address ID is required'}), 400

        with mysql.cursor() as cursor:
            # Update the delivery address ID
            update_query = """
                UPDATE Cart
                SET delivery_address_id = %s
                WHERE customer_id = %s
                AND cart_id = %s
                AND cart_status IN ('active', 'pending_confirm', 'confirm')
            """
            cursor.execute(update_query, (
                address_id,
                customer_id,
                cart_id
            ))
            mysql.commit()

        return jsonify({'message': 'Delivery address updated successfully'}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to update delivery address'}), 500
    finally:
        mysql.close()

@app.route('/api/update_choose_prescription', methods=['POST'])
@token_required
def update_choose_prescription(customer_id):
    mysql = get_mysql_connection()
    try:
        data = request.get_json()
        address_id = data.get('prescription_id')
        cart_id = data.get("cart_id", "cart_id")

        if not address_id:
            return jsonify({'message': 'Prescription ID is required'}), 400

        with mysql.cursor() as cursor:
            # Update the delivery address ID
            update_query = """
                UPDATE Cart
                SET prescription_id = %s
                WHERE customer_id = %s
                AND cart_status IN ('active', 'pending_confirm', 'confirm')
                AND cart_id = %s
            """
            cursor.execute(update_query, (
                address_id,
                customer_id,
                cart_id
            ))
            mysql.commit()

        return jsonify({'message': 'Delivery address updated successfully'}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to update delivery address'}), 500
    finally:
        mysql.close()


@app.route('/api/update_delivery_charge', methods=['POST'])
@token_required
def update_delivery_charge(customer_id):
    mysql = get_mysql_connection()
    try:
        data = request.get_json()
        cart_id = data.get("cart_id", "cart_id")
        shipping_charge = data.get("shipping_charge", 50)


        with mysql.cursor() as cursor:
            # Update cart with new quantities
            update_query = """
                UPDATE Cart
                SET shipping_charge=%s
                WHERE cart_id = %s
            """
            cursor.execute(update_query, (shipping_charge, cart_id ))
            mysql.commit()

        return jsonify({'message': 'Cart updated successfully'}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to update cart'}), 500
    finally:
        mysql.close()

@app.route('/api/cart_status_update', methods=['POST'])
@token_required
def cart_status_update(customer_id):
    mysql = get_mysql_connection()
    try:
        data = request.get_json()
        cart_id = data.get("cart_id", "cart_id")
        cart_status = data.get("cart_status", "cart_status")


        with mysql.cursor() as cursor:
            # Update cart with new quantities
            update_query = """
                UPDATE Cart
                SET cart_status=%s
                WHERE cart_id = %s
            """
            cursor.execute(update_query, (cart_status, cart_id ))
            mysql.commit()
            
            # get user_id
            select_query = "SELECT customer_id, order_tracking_id FROM Cart WHERE cart_id = %s"
            cursor.execute(select_query, (cart_id,))
            out = cursor.fetchone()
            user_id = out["customer_id"]
            order_tracking_id = out["order_tracking_id"]

            if cart_status == "cancelled":
                cancel_courier(order_tracking_id)
            
            send_order_confirmation_notification(user_id)

        return jsonify({'message': 'Cart updated successfully'}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to update cart'}), 500
    finally:
        mysql.close()

@app.route('/api/cart_update', methods=['POST'])
@token_required
def update_cart(customer_id):
    mysql = get_mysql_connection()
    try:
        data = request.get_json()
        product_quantities = data.get('quantities', {})
        cart_id = data.get("cart_id", "cart_id")

        if not product_quantities:
            return jsonify({'message': 'No quantities provided'}), 400


        with mysql.cursor() as cursor:
            # Update cart with new quantities
            update_query = """
                UPDATE Cart
                SET product_ids_qty = %s, cart_status='active'
                WHERE cart_id = %s AND cart_status IN ('active', 'pending_confirm', 'confirm')
            """
            cursor.execute(update_query, (product_quantities, cart_id))
            mysql.commit()
        
        create_notification_to_admin(customer_id, f"Cart updated for cart {cart_id}", f"/admin/customer_detail/{customer_id}", "order")

        return jsonify({'message': 'Cart updated successfully'}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to update cart'}), 500
    finally:
        mysql.close()

@app.route('/api/update_payment', methods=['POST'])
def update_payment():
    mysql = get_mysql_connection()
    try:
        data = request.get_json()
        cart_id = data.get("cart_id", "cart_id")
        total_cart_value = data.get("total_cart_value", 0)
        coupon_savings = data.get("coupon_savings", 0)


        with mysql.cursor() as cursor:
            # Update cart with new quantities
            update_query = """
                UPDATE Cart SET cart_status = "payment", total_cart_value=%s, coupon_savings=%s
                WHERE cart_id = %s 
            """
            cursor.execute(update_query, (cart_id,total_cart_value, coupon_savings))
            mysql.commit()

        return jsonify({'message': 'Cart updated successfully'}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to update cart'}), 500
    finally:
        mysql.close()


@app.route('/api/place_order', methods=['POST'])
@token_required
def place_order(customer_id):
    mysql = get_mysql_connection()
    try:
        data = request.get_json()
        cart_id = data.get("cart_id", "cart_id")
        total_cart_value = data.get("total_cart_value", 0)
        delivery_type = data.get("delivery_type", "normal")

        with mysql.cursor() as cursor:
            
            # Update cart with new quantities
            update_query = """
                UPDATE Cart 
                SET cart_status = "pending_confirm", 
                    total_cart_value = %s,
                    delivery_type = %s,
                    delivery_address_id = IF(delivery_address_id = 0, 
                                            (SELECT id FROM Addresses WHERE customer_id = %s AND `default` = 1 LIMIT 1), 
                                            delivery_address_id)
                WHERE cart_id = %s
            """
            cursor.execute(update_query, (total_cart_value, delivery_type, customer_id, cart_id))
            mysql.commit()
        
        create_notification_to_admin(customer_id, f"New order placed for cart {cart_id}", f"/admin/customer_detail/{customer_id}", "order")

        return jsonify({'message': 'Cart updated successfully'}), 200
    except Exception as e:
        print(e)
        return jsonify({'message': 'Failed to update cart'}), 500
    finally:
        mysql.close()


@app.route('/api/add-to-cart', methods=['POST'])
@token_required
def add_to_cart(customer_id):
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity')

    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Check if the customer has an existing cart
            query = "SELECT cart_id FROM Cart WHERE customer_id = %s AND cart_status IN ('active', 'pending_confirm', 'confirm')"
            cursor.execute(query, (customer_id,))
            cart = cursor.fetchone()
            if cart:
                cart_id = cart['cart_id']
                # Update existing cart
                query = "UPDATE Cart SET product_ids_qty = CONCAT(IFNULL(product_ids_qty, ''), %s, ':', %s, ';'), cart_status = 'active' WHERE cart_id = %s"
                cursor.execute(query, (product_id, quantity, cart_id))
            else:
                # Create new cart
                query = "INSERT INTO Cart (customer_id, cart_status, product_ids_qty) VALUES (%s, 'active', %s)"
                cursor.execute(query, (customer_id, f"{product_id}:{quantity};"))
                cart_id = cursor.lastrowid
  
            select_query = "SELECT product_ids_qty FROM Cart WHERE cart_id = %s"
            cursor.execute(select_query, (cart_id,))
            updated_count = cursor.fetchone()["product_ids_qty"]
            mysql.commit()

        return jsonify({'message': 'Product added to cart successfully', "cart_items": updated_count }), 200
    finally:
        mysql.close()

@app.route('/api/all_coupons', methods=['GET'])
def all_coupons():
    conn = get_mysql_connection()
    try:
        with conn.cursor() as cursor:
            # Fetch all active coupons
            cursor.execute("SELECT * FROM Coupons")
            all_coupons = cursor.fetchall()
            return jsonify({
                'all_coupons': all_coupons,
            })
    finally:
        conn.close()

@app.route('/api/coupon', methods=['POST'])
def add_coupon():
    data = request.json
    conn = get_mysql_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
            INSERT INTO Coupons (coupon_code, coupon_text, applicable_on_product_ids, coupon_type, discount_value, minimum_order_value, available_from_date, available_till_date, coupon_status, coupon_usage_limit)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (
                data['coupon_code'],
                data['coupon_text'],
                data['applicable_on_product_ids'],
                data['coupon_type'],
                data['discount_value'],
                data['minimum_order_value'],
                data['available_from_date'],
                data['available_till_date'],
                data['coupon_status'],
                data.get('coupon_usage_limit')
            ))
            conn.commit()
            return jsonify({'message': 'Coupon added successfully'}), 201
    finally:
        conn.close()

@app.route('/api/coupon/<int:coupon_id>', methods=['PUT'])
def update_coupon(coupon_id):
    data = request.json
    conn = get_mysql_connection()
    try:
        with conn.cursor() as cursor:
            sql = """
            UPDATE Coupons SET
                coupon_code = %s,
                coupon_text = %s,
                applicable_on_product_ids = %s,
                coupon_type = %s,
                discount_value = %s,
                minimum_order_value = %s,
                available_from_date = %s,
                available_till_date = %s,
                coupon_status = %s,
                coupon_usage_limit = %s
            WHERE coupon_id = %s
            """
            cursor.execute(sql, (
                data['coupon_code'],
                data['coupon_text'],
                data['applicable_on_product_ids'],
                data['coupon_type'],
                data['discount_value'],
                data['minimum_order_value'],
                data['available_from_date'],
                data['available_till_date'],
                data['coupon_status'],
                data.get('coupon_usage_limit'),
                coupon_id
            ))
            conn.commit()
            return jsonify({'message': 'Coupon updated successfully'})
    finally:
        conn.close()

@app.route('/api/coupon/<int:coupon_id>', methods=['DELETE'])
def delete_coupon(coupon_id):
    conn = get_mysql_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute("DELETE FROM Coupons WHERE coupon_id = %s", (coupon_id,))
            conn.commit()
            return jsonify({'message': 'Coupon deleted successfully'})
    finally:
        conn.close()

# Helper function to parse product_ids_qty in the Cart table
def get_product_ids_from_cart(cart):
    product_ids_qty = cart['product_ids_qty']
    product_ids = [item.split(":")[0] for item in product_ids_qty.split(";") if item]
    return product_ids

@app.route('/api/cart_coupons/<int:cart_id>', methods=['GET'])
def get_applicable_coupons(cart_id):
    conn = get_mysql_connection()
    try:
        with conn.cursor() as cursor:
            # Fetch the cart
            cursor.execute("SELECT * FROM Cart WHERE cart_id = %s", (cart_id,))
            cart = cursor.fetchone()

            if not cart:
                return jsonify({'message': 'Cart not found'}), 404
            
            # Extract product IDs from the cart
            product_ids_in_cart = get_product_ids_from_cart(cart)

            # Fetch all active coupons
            cursor.execute("SELECT * FROM Coupons WHERE coupon_status = 'active'")
            all_coupons = cursor.fetchall()

            available_coupons = []
            unavailable_coupons = []
            
            # Filter applicable and unavailable coupons
            for coupon in all_coupons:
                applicable_products = [p.strip() for p in coupon['applicable_on_product_ids'].split(",") if p.strip()]
                # If coupon is applicable to all products or contains products in the cart
                if "*" in applicable_products or any(product_id in applicable_products for product_id in product_ids_in_cart):
                    # Check if the total cart value meets the minimum order value for the coupon
                    if cart['total_cart_value'] >= float(coupon['minimum_order_value']):
                        available_coupons.append(coupon)
                    else:
                        unavailable_coupons.append(coupon)
                else:
                    unavailable_coupons.append(coupon)

            return jsonify({
                'available_coupons': available_coupons,
                'unavailable_coupons': unavailable_coupons
            })
    finally:
        conn.close()

@app.route('/api/apply_coupon', methods=['POST'])
@token_required
def apply_coupon(customer_id):
    conn = get_mysql_connection()
    data = request.get_json()
    cart_id = data.get('cart_id')
    coupon_code = data.get('coupon_code')

    try:
        with conn.cursor() as cursor:
            # Fetch the cart
            cursor.execute("SELECT * FROM Cart WHERE cart_id = %s", (cart_id,))
            cart = cursor.fetchone()

            if not cart:
                return jsonify({'message': 'Cart not found'}), 404
            
            # Extract product IDs from the cart
            product_ids_in_cart = get_product_ids_from_cart(cart)

            # Fetch all active coupons
            cursor.execute("SELECT * FROM Coupons WHERE coupon_status = 'active' AND coupon_code=%s", (coupon_code,) )
            all_coupons = cursor.fetchall()

            available_coupons = []
            unavailable_coupons = []
            
            # Filter applicable and unavailable coupons
            for coupon in all_coupons:
                applicable_products = [p.strip() for p in coupon['applicable_on_product_ids'].split(",") if p.strip()]
                # If coupon is applicable to all products or contains products in the cart
                if "*" in applicable_products or any(product_id in applicable_products for product_id in product_ids_in_cart):
                    # Check if the total cart value meets the minimum order value for the coupon
                    if cart['total_cart_value'] >= float(coupon['minimum_order_value']):
                        available_coupons.append(coupon)
                    else:
                        unavailable_coupons.append(coupon)
                else:
                    unavailable_coupons.append(coupon)

            if len(available_coupons):
                coupon = available_coupons[0]
                if coupon["coupon_type"] == "percentage":
                    coupon_savings = float(cart['total_cart_value']) * (float(coupon['discount_value']) /100)
                elif coupon["coupon_type"] == "fixed" or coupon["coupon_type"] == None :
                    coupon_savings = coupon['discount_value']
                else:
                    coupon_savings = 0
                return jsonify({'coupon_savings': round(coupon_savings, 2)}), 200
            else:
                return jsonify({'statusText': 'Coupon code not applicable'}), 404
    except Exception as e:
        print(e)
        return jsonify({'statusText': 'Backend error'}), 500
    finally:
        conn.close()



@app.route('/api/cart', methods=['GET'])
@token_required
def get_cart(customer_id):
    mysql = get_mysql_connection()
    all_orders = int(request.args.get('all_orders', 0))
    cart_id = int(request.args.get('cart_id', -1))
    all_carts = []
    try:
        with mysql.cursor() as cursor:
            # Fetch cart details
            cart_query = """
                SELECT cart_status, product_ids_qty, delivery_address_id, prescription_id, cart_id, shipping_charge, cart_updated_date, cart_created_date, order_tracking_id, payment_id, coupon_savings, coupon_applied,delivery_type 
                FROM Cart
                WHERE customer_id = %s
            """
            if (not all_orders) and cart_id <= 0:
                cart_query = cart_query + " AND cart_status IN ('active', 'confirm', 'pending_confirm')"
            
            if cart_id > 0:
                cart_query = cart_query + f" AND cart_id = {str(cart_id)}"

            cart_query = cart_query + " ORDER BY cart_updated_date DESC"
            cursor.execute(cart_query, (customer_id,))
            carts = cursor.fetchall()

            if not carts:
                return jsonify({'message': 'Cart not found'}), 404

            for cart in carts:
                # Parse product_ids_qty safely
                product_quantities = {}
                product_ids_qty = cart["product_ids_qty"].split(';')
                for pq in product_ids_qty:
                    if pq:
                        parts = pq.split(':')
                        if len(parts) == 2:
                            product_id = parts[0]
                            try:
                                quantity = int(parts[1])
                                if product_id in product_quantities:
                                    product_quantities[product_id] = product_quantities[product_id] + quantity
                                else:
                                    product_quantities[product_id] = quantity
                            except ValueError:
                                continue

                # Extract product IDs
                product_ids = list(product_quantities.keys())

                # Fetch products data
                products_data = []
                if product_ids:
                    products_query = """
                        SELECT product_id, name, manufacturer, product_pricing_old, product_pricing_new, 
                            JSON_UNQUOTE(JSON_EXTRACT(photo, '$[0].img')) AS first_image_url, 
                            prescription_required
                        FROM Products
                        WHERE product_id IN (%s)
                    """ % ','.join(['%s'] * len(product_ids))
                    
                    cursor.execute(products_query, tuple(product_ids))
                    products = cursor.fetchall()

                    for product in products:
                        product_id = str(product['product_id'])
                        products_data.append({
                            'id': product['product_id'],
                            'image': product["first_image_url"],
                            'name': product['name'],
                            'manufacturer': product['manufacturer'],
                            'originalPrice': f"Rs. {product['product_pricing_old']}",
                            'discountedPrice': f"Rs. {product['product_pricing_new']}",
                            'quantity': product_quantities.get(product_id, 1),
                            'discountPercentage': f"{round((product['product_pricing_old'] - product['product_pricing_new']) / product['product_pricing_old'] * 100)}% less Price",
                            'prescriptionRequired': product['prescription_required']  # Add prescription_required field
                        })

                # Fetch the delivery address
                address_query = """
                    SELECT name, address1 AS addressLine1, state AS addressLine2, state, pincode, type, phone_number
                    FROM Addresses
                    WHERE customer_id = %s AND id = %s
                """
                cursor.execute(address_query, (customer_id, cart.get('delivery_address_id')))
                address = cursor.fetchone()

                if not address:
                    # If no specific address, get the default address
                    address_query = """
                        SELECT name, address1 AS addressLine1, state AS addressLine2, state, pincode, type, phone_number
                        FROM Addresses
                        WHERE customer_id = %s AND `default` = 1
                    """
                    cursor.execute(address_query, (customer_id,))
                    address = cursor.fetchone()

                # Fetch total MIG Coins available from the Customers table
                mig_coins_query = """
                    SELECT total_mig_coins_available
                    FROM Customers
                    WHERE customer_id = %s
                """
                cursor.execute(mig_coins_query, (customer_id,))
                mig_coins = cursor.fetchone()

                # Calculate total MRP and total selling price
                total_mrp = sum([
                    product['product_pricing_old'] * product_quantities.get(str(product['product_id']), 0)
                    for product in products
                ]) or 0

                total_selling_price = sum([
                    product['product_pricing_new'] * product_quantities.get(str(product['product_id']), 0)
                    for product in products
                ]) or 0

                total_discount = total_mrp - total_selling_price


                # Calculate the total payable amount
                total_shipping_charge = Decimal(cart.get("shipping_charge", 0))
                mig_coins_sub = mig_coins.get("total_mig_coins_available", 0) if mig_coins.get("total_mig_coins_available", 0) else 0
                total_payable_amount = total_selling_price + total_shipping_charge

                # Calculate the percentage saved including the discount and MIG Coins used
                total_percentage_saved = (
                    f"{round((total_discount / total_mrp) * 100)}%" 
                    if total_mrp > 0 else "0%"
                )

                # Fetch prescription details if prescription_id is available
                prescription_details = {}
                if cart.get('prescription_id'):
                    prescription_query = """
                        SELECT prescription_id, prescription_image_url, prescription_date, prescription_status, 
                            prescription_comments, last_used_date, prescription_name
                        FROM Prescription
                        WHERE prescription_id = %s
                    """
                    cursor.execute(prescription_query, (cart['prescription_id'],))
                    prescription_details = cursor.fetchone()
                
                courier_tracking = []
                if cart['cart_status'] in ["payment", "delivery", "cancelled"]:
                    courier_tracking = get_tracking_details(cart["order_tracking_id"])
                
                all_carts.append({
                    'cart': products_data,
                    'cart_id': cart["cart_id"],
                    "delivery_type": cart["delivery_type"],
                    'orderSummary': {
                        'itemsCount': sum(product_quantities.values()),
                        'totalMRP': f"Rs. {total_mrp}",
                        'total_selling_price': f"Rs. {total_selling_price}",
                        'totalPercentageSaved': total_percentage_saved,
                        'total_shipping_charge': total_shipping_charge,
                        'totalSavings': f"Rs. {total_discount}",
                        'migCoins': mig_coins_sub,
                        'totalAmount': total_payable_amount,
                    },
                    "cart_updated_date": cart["cart_updated_date"], 
                    "cart_created_date": cart["cart_created_date"],
                    'deliveryAddress': address,
                    'cartStatus': cart['cart_status'],
                    "courier_tracking": courier_tracking,
                    "order_tracking_id": cart["order_tracking_id"],
                    "payment_id": cart.get("payment_id"),
                    "coupon_savings": cart.get("coupon_savings"),
                    "coupon_applied": cart.get("coupon_applied"),
                    'prescriptionDetails': prescription_details  # Include prescription details
                })
            
            if all_orders:
                return jsonify(all_carts), 200
            else:  
                return jsonify(all_carts[0]), 200
    except Exception as e:
        raise e
    finally:
        mysql.close()




@app.route('/api/request-product', methods=['POST'])
@token_required
def request_product(customer_id):
    data = request.get_json()
    product_id = data.get('product_id')
    
    mysql = get_mysql_connection()
    
    # Insert request into database
    with mysql.cursor() as cursor:
        query = "INSERT INTO ProductRequest (product_id, customer_id, request_date, status) VALUES (%s, %s, NOW(), 'pending')"
        cursor.execute(query, (product_id, customer_id))
        mysql.commit()
    
    create_notification_to_admin(customer_id, f"Product request for product {product_id}", f"/admin/product-edit/{product_id}", "product_request")
    
    return jsonify({'message': 'Product request submitted successfully'}), 200

@app.route('/api/products', methods=['POST'])
def get_products():
    # Extract data from POST request
    data = request.json
    page = int(data.get('page', 1))
    query_string = data.get('query', '')
    text = data.get('text', '')
    show_hidden = data.get('show_hidden', False)

    category = None
    if ":" in text:
        category, text = text.split(":", 1)
        if text == "":
            text = " "

    per_page = 10

    # Construct SQL query
    query = """
        SELECT name AS product_name, 
               product_id, 
               JSON_UNQUOTE(JSON_EXTRACT(photo, '$[0].img')) AS first_image_url,
               product_pricing_new, 
               product_pricing_old,
               salt_name, 
               composition,
               categories as selected_category, 
               inventory_info_total_stock as product_available,
               True as product_request,
               rc,
               LENGTH(composition) as lencomp,
               product_name_url,
               c.category_outline_url
        FROM Products p 
        LEFT JOIN Category c ON p.categories = c.category_name
        WHERE 1=1
    """

    # Add query conditions
    if query_string:
        query += f" AND ({query_string})"

    # Add text search if present
    if text:
        normalized_text = text.replace('-', '').replace(' ', '')  # Normalize search text
        query += f"""
            AND (
                REPLACE(REPLACE(name, '-', ''), ' ', '') LIKE '%{normalized_text}%' 
                OR REPLACE(REPLACE(salt_name, '-', ''), ' ', '') LIKE '%{normalized_text}%' 
                OR REPLACE(REPLACE(composition, '-', ''), ' ', '') LIKE '%{normalized_text}%'
            )
        """
        if category:
            query += f" AND categories='{category}' "
    
    if not show_hidden:
        query += " AND visibility_status = 'Published' "
      
    mysql = get_mysql_connection()

    # Execute query to get total count
    with mysql.cursor() as cursor:
        cursor.execute(query)
        total_count = cursor.rowcount

    # Pagination
    offset = (page - 1) * per_page

    # Determine order based on query string
    if "rc=0" in query_string:
        pricing_order = "DESC"
    else:
        pricing_order = "ASC"

    # Determine order based on whether text search or query is used
    if text:
        # If text is used, order by closest match to text
        # Assuming MySQL; modify accordingly if using other DBMS
        query += f"""
            ORDER BY rc DESC, LOCATE('{text}', name) DESC, lencomp, product_pricing_new {pricing_order}, product_id 
        """
    else:
        # Otherwise, order by product_id
        query += f" ORDER BY product_pricing_new {pricing_order}"

    query += f" LIMIT {per_page} OFFSET {offset}"

    # Execute query for paginated results
    with mysql.cursor() as cursor:
        cursor.execute(query)
        results = cursor.fetchall()

    # Calculate total pages
    total_pages = (total_count + per_page - 1) // per_page

    # Prepare response
    response = {
        'current_page': page,
        'total_pages': total_pages,
        'total_results': total_count,
        'results': results
    }

    return jsonify(response)

@app.route('/api/avg_price', methods=['POST'])
def avg_price():
    # Extract data from POST request
    data = request.json
    composition = data.get('composition', '')
    salt_name = data.get('salt_name', '')

    if composition:
        # Construct SQL query
        query = """
            SELECT AVG(product_pricing_old)  AS avg_product_pricing_old
                    FROM Products 
                    WHERE composition = %s 
        """
        search_term = composition
    else:
        # Construct SQL query
        query = """
            SELECT AVG(product_pricing_old)  AS avg_product_pricing_old
                    FROM Products 
                    WHERE salt_name = %s 
        """
        search_term = salt_name

    mysql = get_mysql_connection()

    with mysql.cursor() as cursor:
        cursor.execute(query, (search_term,))
        result = cursor.fetchone()

    # Prepare response
    response = {
        "averagePrice": result["avg_product_pricing_old"]
    }

    return jsonify(response)


def place_courier_order(order_id, destination_details):

    api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/order_create_courier_244234"
    response = requests.post(api_url, json={"order_id": order_id, "destination_details": destination_details})

    # Check if the request was successful
    if response.status_code == 200:
        resp = response.json()
        if resp.get("status", False) == "OK":
            for r in  resp.get("data", []):
                return r.get("reference_number", False)
        else:
            return False
    else:
        return False

def get_tracking_details(order_id):

    api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/order_tracking_34434523"
    response = requests.post(api_url, json={"order_id": order_id})
    print(response)

    # Check if the request was successful
    if response.status_code == 200:
        return response.json()
    else:
        return []
    

def cancel_courier(order_id):

    api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/order_cancel_34234342"
    response = requests.post(api_url, json={"order_id": order_id})
    print(response)

    # Check if the request was successful
    if response.status_code == 200:
        resp = response.json()
        if resp.get("status", False) == "OK":
            for r in  resp.get("successConsignments", []):
                return r.get("success", False)
        else:
            return False
    else:
        return False

@app.route('/api/cancel_order', methods=['POST'])
@token_required
def cancel_order(customer_id):
    data = request.get_json()
    cart_id = data.get('cart_id')
    
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Fetch the cart
            cursor.execute("SELECT * FROM Cart WHERE cart_id = %s AND customer_id=%s", (cart_id,customer_id))
            cart = cursor.fetchone()

            if not cart:
                return jsonify({'message': 'Cart not found'}), 404

            if cart["cart_status"] == "payment":
                # Cancel courier order
                cancel_courier(cart["order_tracking_id"])
                
                # Update cart status to cancelled
                cursor.execute("UPDATE Cart SET cart_status = 'cancelled' WHERE cart_id = %s", (cart_id,))
                mysql.commit()
                return jsonify({'message': 'Order cancelled successfully'}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({'message': 'Failed to cancel order'}), 500
    finally:
        mysql.close()
    

@app.route('/api/orders', methods=['GET'])
@token_required
def get_orders(current_user):
    try:
        page = int(request.args.get('page', 1))
        per_page = 5
        offset = (page - 1) * per_page
        search_query = request.args.get('search', '')

        mysql = get_mysql_connection()

        with mysql.cursor() as cursor:
            # Modify query based on search input
            if search_query:
                search_query = f"%{search_query}%"
                count_sql = """
                SELECT COUNT(*) AS total_count
                FROM Cart
                WHERE customer_id = %s AND (cart_id = %s OR cart_updated_date LIKE %s) AND cart_status IN ('payment','dispatched','delivered', 'cancelled')
                """
                cursor.execute(count_sql, (current_user, search_query, search_query))
            else:
                count_sql = "SELECT COUNT(*) AS total_count FROM Cart WHERE customer_id = %s AND cart_status IN ('payment','dispatched','delivered', 'cancelled')"
                cursor.execute(count_sql, (current_user,))

            total_count = cursor.fetchone()['total_count']

            # Fetch paginated orders with search logic
            if search_query:
                fetch_sql = """
                SELECT cart_id, cart_updated_date, cart_status, product_ids_qty, auto_refill 
                FROM Cart
                WHERE customer_id = %s AND (cart_id = %s OR cart_updated_date LIKE %s) AND cart_status IN ('payment','dispatched','delivered', 'cancelled')
                ORDER BY cart_updated_date DESC
                LIMIT %s OFFSET %s
                """
                cursor.execute(fetch_sql, (current_user, search_query, search_query, per_page, offset))
            else:
                fetch_sql = """
                SELECT cart_id, cart_updated_date, cart_status, product_ids_qty, auto_refill
                FROM Cart
                WHERE customer_id = %s AND cart_status IN ('payment','dispatched','delivered', 'cancelled')
                ORDER BY cart_updated_date DESC
                LIMIT %s OFFSET %s
                """
                cursor.execute(fetch_sql, (current_user, per_page, offset))

            orders = cursor.fetchall()

            order_list = []
            for order in orders:
                order_data = {
                    "id": order['cart_id'],
                    "date": order['cart_updated_date'].strftime("%Y-%m-%d %H:%M:%S"),
                    "status": order['cart_status'],
                    "product_ids_qty": order["product_ids_qty"],
                    "auto_refill": order["auto_refill"]
                }
                order_list.append(order_data)

            return jsonify({
                "orders": order_list,
                "total_pages": (total_count + per_page - 1) // per_page,
                "current_page": page,
                "has_next": page < (total_count + per_page - 1) // per_page,
                "has_prev": page > 1
            }), 200
    except Exception as e:
        print(e)
        return jsonify({"message": str(e)}), 500

@app.route('/api/offers', methods=['GET'])
def get_offers():
    try:
        page = int(request.args.get('page', 1))
        per_page = 5
        offset = (page - 1) * per_page

        mysql = get_mysql_connection()

        cursor = mysql.cursor()
        # Count total offers
        cursor.execute("SELECT COUNT(*) AS total_count FROM Offers")
        total_count = cursor.fetchone()['total_count']

        # Fetch paginated offers
        cursor.execute("""
            SELECT * FROM Offers
            ORDER BY creation_date DESC
            LIMIT %s OFFSET %s
        """, (per_page, offset))
        offers = cursor.fetchall()

        offer_list = []
        for offer in offers:
            offer_data = {
                "id": offer['id'],
                "title": offer['title'],
                "description": offer['description'],
                "image": offer['image'],
                "linkText": offer['linkText'],
                "linkIcon": offer['linkIcon'],
                "creation_date": offer['creation_date'].strftime("%Y-%m-%d %H:%M:%S")
            }
            offer_list.append(offer_data)

        return jsonify({
            "offers": offer_list,
            "total_pages": (total_count + per_page - 1) // per_page,
            "current_page": page,
            "has_next": page < (total_count + per_page - 1) // per_page,
            "has_prev": page > 1
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    try:
        page = int(request.args.get('page', 1))
        filter_type = request.args.get('filter', 'all')  # Filter by type or 'all'
        per_page = 10
        offset = (page - 1) * per_page

        all_notifications = request.args.get("all_notifications", 0)

        mysql = get_mysql_connection()

        with mysql.cursor() as cursor:
            # Count total notifications
            count_sql = "SELECT COUNT(*) AS total_count FROM Notifications WHERE notification_receiver = %s"
            
            # Adjust the count query to consider filter_type if it's not 'all'
            if filter_type != 'all':
                count_sql += " AND noti_type = %s"
                cursor.execute(count_sql, (current_user, filter_type))
            else:
                cursor.execute(count_sql, (current_user,))
            
            total_count = cursor.fetchone()['total_count']

            # Fetch paginated notifications
            fetch_sql = f"""
            SELECT * FROM Notifications
            WHERE notification_receiver = %s
            {" AND noti_type = %s" if filter_type != 'all' else ""}
            {" AND date_received < NOW()" if not all_notifications else ""}
            ORDER BY date_received DESC
            LIMIT %s OFFSET %s
            """
            
            # Adjust parameters for filter_type
            if filter_type != 'all':
                cursor.execute(fetch_sql, (current_user, filter_type, per_page, offset))
            else:
                cursor.execute(fetch_sql, (current_user, per_page, offset))

            notifications = cursor.fetchall()

            notification_list = []
            for notification in notifications:
                notification_data = {
                    "id": notification['notification_id'],
                    "sender": notification['notification_sender'],
                    "receiver": notification['notification_receiver'],
                    "message": notification['notification_message'],
                    "action_url": notification['action_url'],
                    "noti_type": notification['noti_type'],
                    "date_received": notification['date_received'].astimezone(timezone.utc).isoformat(),
                    "read_status": notification['read_status'].astimezone(timezone.utc).isoformat() if notification['read_status'] else None
                }

                notification_list.append(notification_data)

            return jsonify({
                "notifications": notification_list,
                "total_pages": (total_count + per_page - 1) // per_page,
                "current_page": page,
                "has_next": page < (total_count + per_page - 1) // per_page,
                "has_prev": page > 1
            }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

# API to mark a notification as read
@app.route('/api/notifications/<int:notification_id>/mark-as-read', methods=['PUT'])
def mark_notification_as_read(notification_id):
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            update_sql = """
            UPDATE Notifications
            SET read_status = %s
            WHERE notification_id = %s
            """
            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            cursor.execute(update_sql, (current_time, notification_id))
            mysql.commit()

            return jsonify({"message": f"Notification {notification_id} marked as read."}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500
    finally:
        cursor.close()
        
def send_order_confirmation_notification(user_id):
    message = f"Your Medingen cart has been updated. Please open the app to view the changes and action."
    date_received = datetime.now()
    notification_receiver = user_id
    
    mysql = get_mysql_connection()
    with mysql.cursor() as cursor:
        insert_sql = """
        INSERT INTO Notifications (notification_sender, notification_receiver, notification_message, date_received, read_status)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_sql, ("admin1", user_id, message, date_received, None))
        mysql.commit()
        
        cursor.execute("SELECT endpoint, p256dh, auth FROM PushSubscriptions WHERE user_id = %s", (notification_receiver,))
        subscriptions = cursor.fetchall()

        for subscription in subscriptions:
            api_data = {
                "payload": {
                    "title": "Medingen",
                    "body": message,
                    "icon": "/android-chrome-192x192.png",
                    "target_url": "https://medingen.in/cart"
                },
                "subscription": subscription,
                "schedule_time": date_received.strftime("%Y-%m-%d %H:%M:%S")

            }

            api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/send_notification_247832438"
            response = requests.post(api_url, json=api_data)
        
def send_welcome_default_notification(user_id):
        
    message = """
    📢 Exciting News from Medingen!
    🚀 The Medingen Pilot Study is NOW LIVE! 🚀

    Be among the first to experience high-quality generic medicines at unbeatable prices. For a limited time, enjoy a flat 20% discount on ALL products! 🏷️💊

    Don't miss out - order now and get your medicines delivered right to your doorstep! 🏠🚚

    T&Cs apply

    message 2 notisification

    🎉 Special Offer Alert!

    🔍 Help Us Improve & Get Rewarded!

    During the Medingen Pilot Study, we’re offering unlimited cashback on your orders! 💸 Simply participate by identifying any errors or bugs in the MIG platform, and you'll earn cashback to use on your next purchase! 🛒

    Be a part of enhancing Medingen and enjoy exclusive rewards for your efforts!

    T&Cs apply
    """
    # after 30 mins of user creation
    date_received = datetime.now() + timedelta(minutes=3)
    notification_receiver = user_id
    
    mysql = get_mysql_connection()
    with mysql.cursor() as cursor:
        insert_sql = """
        INSERT INTO Notifications (notification_sender, notification_receiver, notification_message, date_received, read_status)
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(insert_sql, ("admin1", user_id, message, date_received, None))
        mysql.commit()
        
        cursor.execute("SELECT endpoint, p256dh, auth FROM PushSubscriptions WHERE user_id = %s", (notification_receiver,))
        subscriptions = cursor.fetchall()

        for subscription in subscriptions:
            api_data = {
                "payload": {
                    "title": "Medingen",
                    "body": message,
                    "icon": "/android-chrome-192x192.png",
                    "target_url": "/notification"
                },
                "subscription": subscription,
                "schedule_time": date_received.strftime("%Y-%m-%d %H:%M:%S")

            }

            api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/send_notification_247832438"
            response = requests.post(api_url, json=api_data)


@app.route('/api/create_notification', methods=['POST'])
@token_required
def create_notification(current_user):
    try:
        data = request.get_json()
        notification_sender = current_user  # Assuming admin is the current user
        notification_receiver = data['receiver']
        message = data['message']
        date_received = datetime.fromisoformat(data['date_received'])
        read_status = None  # Initially, the notification is unread

        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            insert_sql = """
            INSERT INTO Notifications (notification_sender, notification_receiver, notification_message, date_received, read_status)
            VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(insert_sql, (notification_sender, notification_receiver, message, date_received, read_status))
            mysql.commit()

            cursor.execute("SELECT endpoint, p256dh, auth FROM PushSubscriptions WHERE user_id = %s", (notification_receiver,))
            subscriptions = cursor.fetchall()

            for subscription in subscriptions:
                api_data = {
                    "payload": {
                        "title": "Medingen",
                        "body": message,
                        "icon": "/android-chrome-192x192.png",
                        "target_url": "/notification"
                    },
                    "subscription": subscription,
                    "schedule_time": date_received.strftime("%Y-%m-%d %H:%M:%S")

                }

                api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/send_notification_247832438"
                response = requests.post(api_url, json=api_data)

        return jsonify({"message": "Notification created successfully but not triggered"}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/api/delete_notification/<int:notification_id>', methods=['DELETE'])
@token_required
def delete_notification(current_user, notification_id):
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
           
            # Delete notification
            delete_sql = "DELETE FROM Notifications WHERE notification_id = %s"
            cursor.execute(delete_sql, (notification_id,))
            mysql.commit()

        return jsonify({"message": "Notification deleted successfully"}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": str(e)}), 500


# get categories list from category table
@app.route('/api/categories', methods=['GET'])
def get_categories():
    mysql = get_mysql_connection()
    with mysql.cursor() as cursor:
        query = "SELECT category_name FROM Category"
        cursor.execute(query)
        categories = cursor.fetchall()
        categories_list = []
        for c in categories:
            categories_list.append(c["category_name"])

    return jsonify(categories_list)

@app.route('/api/banner', methods=['POST'])
def get_banner():
    data = request.json

    mysql = get_mysql_connection()
    with mysql.cursor() as cursor:
        query = "SELECT * FROM Banner WHERE section=%s"
        cursor.execute(query, data["section"])
        banners = cursor.fetchall()

    # Loop through each banner and parse the 'content' field
    banner_out = []
    for banner in banners:
        if 'content' in banner and isinstance(banner['content'], str):
            try:
                cleaned_content = banner['content'].replace('\r', '').replace('\n', '').replace('\t', '')
                c = json.loads(cleaned_content)
                c["tnc"] = banner.get("tnc", "")
                banner_out.append(c)  # Parse stringified JSON
            except json.JSONDecodeError:
                banner_out.append({})

    return jsonify(banner_out)

@app.route('/api/product_requests', methods=['GET'])
@token_required
def get_product_requests(current_user):
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT 
                    product_id,
                    customer_id, 
                    request_date, 
                    status 
                FROM ProductRequest
                WHERE customer_id = %s
                ORDER BY request_date DESC
            """
            cursor.execute(query, (current_user,))
            categories = cursor.fetchall()
    finally:
        mysql.close()

    return jsonify(categories)

@app.route('/api/home_categories', methods=['GET'])
def get_home_categories():
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT 
                    category_name,
                    display_name, 
                    show_on_home, 
                    category_image_url 
                FROM Category
                WHERE show_on_home > 0
                ORDER BY show_on_home ASC
            """
            cursor.execute(query)
            categories = cursor.fetchall()
    finally:
        mysql.close()

    return jsonify(categories)

@app.route('/api/update_create_product', methods=['POST'])
@token_required
def update_or_create_product(current_user):
    data = request.json

    # Prepare data for insertion into the database
    categories = data.get('selectedCategory') or 'unknown'  # Default to 'unknown' if categories is NULL
    salt_name = data.get('saltName', '').strip()  # Trim whitespaces
    name = data.get('productName', '')

    if data.get("product_name_url", ""):
        product_name_url = data.get("product_name_url")
    else:
        # Sanitize salt_name
        sanitized_salt_name = re.sub(r'[^a-z0-9]+', '-', salt_name.lower())  # Replace non-alphanumeric characters with hyphens
        sanitized_salt_name = re.sub(r'-+', '-', sanitized_salt_name).strip('-')  # Remove extra hyphens and leading/trailing hyphens

        # Generate product_name_url
        sanitized_name = re.sub(r'[^a-z0-9]+', '-', name.lower())  # Replace non-alphanumeric characters with hyphens
        sanitized_name = re.sub(r'-+', '-', sanitized_name).strip('-')  # Remove extra hyphens and leading/trailing hyphens
        product_name_url = f"{sanitized_name}"

    product_data = {
        'product_id': data.get('product_id'),
        'name': name,
        'rack_id': data.get('rackId'),
        'department_id': data.get('departmentId'),
        'composition': data.get('composition'),
        'composition_code': data.get('composition_code'),
        'schedule_category': data.get('schedule_category'),
        'marketed_by': data.get('marketed_by'),
        'used_for': data.get('used_for'),
        'consume_type': data.get('consumeType'),
        'manufacturer': data.get('manufacturer'),
        'manufacture_date': data.get('manufactureDate'),
        'expiry': data.get('expiryDate'),
        'product_pricing_old': data.get('productPriceOld'),
        'product_pricing_new': data.get('productPriceNew'),
        'product_coupon_code': data.get('productCoupon'),
        'salt_name': salt_name,
        'visibility_status': data.get('visibilityStatus'),
        'inventory_info_total_stock': data.get('totalStockQuantity'),
        'categories': categories,
        'product_description': data.get('productDescription'),
        'prescription_required': data.get('prescription_required'),
        'created_by': current_user,
        'photo': json.dumps(data['images']) if 'images' in data else None,
        'packaging': data.get('packaging'),
        "rc": int(data.get("rc", 1)),
        "tags": ",".join(data.get('tags')),
        'product_name_url': product_name_url,  # Add the generated product_name_url,
        "meta_keywords": data.get("meta_keywords", ""),
        "formulation": data.get("formulation", ""),
        "meta_description": data.get("meta_description", ""),
        "meta_title": data.get("meta_title", "")
    }

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            if product_data['product_id']:
                # Update existing product
                sql = """UPDATE Products SET
                         name = %(name)s,
                         rack_id = %(rack_id)s,
                         department_id = %(department_id)s,
                         composition = %(composition)s,
                         consume_type = %(consume_type)s,
                         composition_code =  %(composition_code)s,
                         schedule_category = %(schedule_category)s,
                         marketed_by = %(marketed_by)s,
                         used_for = %(used_for)s,
                         manufacturer = %(manufacturer)s,
                         manufacture_date = %(manufacture_date)s,
                         expiry = %(expiry)s,
                         product_pricing_old = %(product_pricing_old)s,
                         product_pricing_new = %(product_pricing_new)s,
                         product_coupon_code = %(product_coupon_code)s,
                         salt_name = %(salt_name)s,
                         visibility_status = %(visibility_status)s,
                         inventory_info_total_stock = %(inventory_info_total_stock)s,
                         categories = %(categories)s,
                         long_description = %(product_description)s,
                         photo = %(photo)s,
                         prescription_required = %(prescription_required)s,
                         created_by = %(created_by)s,
                         packaging = %(packaging)s,
                         rc = %(rc)s,
                         tags = %(tags)s,
                         meta_keywords = %(meta_keywords)s,
                        meta_description = %(meta_description)s,
                        meta_title = %(meta_title)s,
                         formulation = %(formulation)s,
                         product_name_url = %(product_name_url)s
                        WHERE product_id = %(product_id)s""" 
                cursor.execute(sql, product_data)
                mysql.commit()

                response = {'message': 'Product updated successfully'}
            else:
                # Insert new product
                sql = """INSERT INTO Products 
                        (name, rack_id, department_id, composition, consume_type, composition_code, schedule_category, 
                        marketed_by, used_for, manufacturer, manufacture_date, expiry, product_pricing_old, 
                        product_pricing_new, product_coupon_code, salt_name, visibility_status, 
                        inventory_info_total_stock, categories, long_description, photo, prescription_required, 
                        created_by, packaging, tags, rc, product_name_url, meta_keywords, meta_title, meta_description, formulation ) -- Include product_name_url in insert
                        VALUES 
                        (%(name)s, %(rack_id)s, %(department_id)s, %(composition)s, %(consume_type)s, %(composition_code)s, 
                        %(schedule_category)s, %(marketed_by)s, %(used_for)s, %(manufacturer)s, %(manufacture_date)s, 
                        %(expiry)s, %(product_pricing_old)s, %(product_pricing_new)s, %(product_coupon_code)s, 
                        %(salt_name)s, %(visibility_status)s, %(inventory_info_total_stock)s, %(categories)s,
                        %(product_description)s, %(photo)s, %(prescription_required)s, %(created_by)s, %(packaging)s, 
                        %(tags)s, %(rc)s, %(product_name_url)s, %(meta_keywords)s, %(meta_title)s, %(meta_description)s, %(formulation)s)"""
                cursor.execute(sql, product_data)
                mysql.commit()

                response = {'message': 'Product created successfully'}

            return jsonify(response), 200

    except Exception as e:
        # Handle any database errors
        print(f"Error: {e}")
        response = {'error': 'Failed to create or update product', "error": str(e)}
        return jsonify(response), 500


# delete_product
@app.route('/api/delete_product/<int:product_id>', methods=['DELETE'])
@token_required
def delete_product(current_user, product_id):
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            # Delete product
            sql = "DELETE FROM Products WHERE product_id = %s"
            cursor.execute(sql, (product_id,))
            mysql.commit()

            return jsonify({'message': 'Product deleted successfully'}), 200

    except Exception as e:
        return jsonify({'message': 'An error occurred', 'error': str(e)}), 500

@app.route('/api/product_details/<int:product_id>', methods=['GET'])
def get_product_details(product_id):
    try:
        product_name = request.args.get('name', None)
        show_hidden = request.args.get('show_hidden', False)

        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            # Fetch product details
            if not product_name:
                sql = "SELECT *, inventory_info_total_stock AS product_available FROM Products WHERE product_id = %s"
                if not show_hidden:
                    sql += " AND visibility_status = 'Published' "

                cursor.execute(sql, (product_id,))
                product = cursor.fetchone()
            else:
                sql = "SELECT *, inventory_info_total_stock AS product_available FROM Products WHERE product_name_url = %s"
                if not show_hidden:
                    sql += " AND visibility_status = 'Published' "

                cursor.execute(sql, (product_name,))
                product = cursor.fetchone()
            
            if not product:
                return jsonify({'message': 'Product not found'}), 404

            product_details = {
                'product_id': product.get('product_id'),
                'rackId': product.get('rack_id'),
                'totalStockQuantity': product.get('inventory_info_total_stock'),
                'departmentId': product.get('department_id'),
                'selectedCategory': product.get('categories'),
                'product_name_url': product.get('product_name_url'),
                'productPriceOld': str(product.get('product_pricing_old')),
                'productPriceNew': str(product.get('product_pricing_new')),
                'productCoupon': product.get('product_coupon_code'),
                'prescription_required': product.get('prescription_required'),
                'productName': product.get('name'),
                'saltName': product.get('salt_name'),
                'composition': product.get('composition'),                
                'composition_code': product.get('composition_code'),
                'schedule_category': product.get('schedule_category'),
                'marketed_by': product.get('marketed_by'),
                'used_for': product.get('used_for'),
                'manufacturer': product.get('manufacturer'),
                'consumeType': product.get('consume_type'),
                'manufactureDate': str(product.get('manufacture_date')),
                'expiryDate': str(product.get('expiry')),
                'productDescription': str(product.get('long_description')),
                'visibilityStatus': product.get('visibility_status'),
                'publishDate': str(product.get('publish_date')),
                'publishTime': str(product.get('publish_time')),
                'tags': product.get('tags').split(',') if product.get('tags') else [],
                'images': json.loads(product.get('photo', "[]")),
                "product_available": product.get("product_available", False),
                "product_request": True,
                'packaging': product.get('packaging'),  # Add packaging field to response
                "rc": product.get("rc"),
                "meta_keywords": product.get("meta_keywords"),
                "meta_description": product.get("meta_description"),
                "meta_title": product.get("meta_title"),
                "formulation": product.get("formulation"),
            }

            return jsonify(product_details)

    except Exception as e:
        return jsonify({'message': 'An error occurred', 'error': str(e)}), 500
    
    finally:
        cursor.close()

@app.route('/api/coupon_details/<string:couponcode>', methods=['GET'])
def get_coupon_details(couponcode):
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            # Fetch product details
            sql = "SELECT * FROM Coupons WHERE coupon_code = %s"
            cursor.execute(sql, (couponcode,))
            coupon = cursor.fetchone()
            
            if not coupon:
                return jsonify({'message': 'Coupon not found'}), 404
            return jsonify(coupon)

    except Exception as e:
        return jsonify({'message': 'An error occurred', 'error': str(e)}), 500
    
    finally:
        cursor.close()


@app.route('/api/send_otp', methods=['POST'])
def send_otp():
    data = request.json
    phone_number = data.get('phone_number')
    otp = generate_random_digits(4)

    # Query database to verify credentials
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Check if the phone number exists
            query = "SELECT * FROM Customers WHERE phonenumber = %s"
            cursor.execute(query, (phone_number,))
            user = cursor.fetchone()

            if user:
                # Update OTP for existing customer
                query = "UPDATE Customers SET otp = %s WHERE phonenumber = %s"
                cursor.execute(query, (otp, phone_number))
            else:
                # Create a new customer record with OTP
                query = "INSERT INTO Customers (phonenumber, otp) VALUES (%s, %s)"
                cursor.execute(query, (phone_number, otp))
            
            mysql.commit()
        
            # return jsonify({"message": "OTP sent successfully"}), 200

        create_notification_to_admin("system", f"New customer with phone number {phone_number} has registered", "/admin/customer-list/", "new_customer")    

        # Send OTP to the phone number
        print(f"Sending OTP {otp} to {phone_number}")
        api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/send_otpx3456sw?phone_number={phone_number}&otp={otp}"
        response = requests.get(api_url)
        print(response)

        # Check if the request was successful
        if response.status_code == 200:
            return jsonify({"message": "OTP sent successfully"}), 200
        else:
            print(f'Error {response.status_code}: {response.text}'), 500

        return jsonify({"message": "OTP sent successfully"}), 200

    except Exception as e:
        mysql.rollback()
        print(f"Error: {e}")
        return jsonify({"message": "An error occurred"}), 500

    finally:
        mysql.close()

@app.route('/api/update_order_auto_refill', methods=['POST'])
def update_order_auto_refill():
    data = request.json
    cart_id = data.get('cart_id')
    auto_refill = data.get('auto_refill')

    # Query database to verify credentials
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = "UPDATE Cart SET auto_refill = %s WHERE cart_id = %s"
            cursor.execute(query, (auto_refill, cart_id))
        
            mysql.commit()

            return jsonify({"message": "Auto refill status updated"}), 200

    except Exception as e:
        mysql.rollback()
        print(f"Error: {e}")
        return jsonify({"message": "An error occurred"}), 500

    finally:
        mysql.close()



@app.route('/api/check_customer', methods=['POST'])
def check_customer():
    data = request.json
    phone_number = data.get('phone_number')

    if not phone_number:
        return jsonify({"message": "Phone number is required"}), 400

    # Query database to check if customer exists
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = "SELECT * FROM Customers WHERE phonenumber = %s"
            cursor.execute(query, (phone_number,))
            user = cursor.fetchone()

            if user:
                # Customer exists
                return jsonify({"exists": True, "message": "Customer found"}), 200
            else:
                # Customer does not exist
                return jsonify({"exists": False, "message": "Customer not found"}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"message": "An error occurred"}), 500

    finally:
        mysql.close()


@app.route('/api/login_otp', methods=['POST'])
def login_otp():
    data = request.json
    phone_number = data.get('phone_number')
    otp = data.get('otp')  

    # Query database to verify credentials
    mysql = get_mysql_connection()
    with mysql.cursor() as cursor:
        query = "SELECT * FROM Customers WHERE phonenumber = %s AND otp = %s"
        cursor.execute(query, (phone_number, otp))
        user = cursor.fetchone()

        if user:
            update_query = "UPDATE Customers SET last_login_date = %s WHERE customer_id = %s"
            cursor.execute(update_query, (datetime.now(), user['customer_id']))
            mysql.commit()
            token = jwt.encode({'customer_id': user['customer_id']}, app.config['SECRET_KEY'], algorithm="HS256")
            return jsonify({'token': token, 'customer_id': user["customer_id"], 'customer_name': user["customer_name"], 'email': user["email"]}), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/create_password', methods=['POST'])
def create_password():
    data = request.json
    phone_number = data.get('phone_number')
    new_password = data.get('password')
    otp = data.get('otp')

    if not phone_number or not new_password or not otp:
        return jsonify({'error': 'Phone number, new password, and OTP are required'}), 400

    # Connect to the database
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Verify OTP and retrieve user details
            query = """
                SELECT customer_id, customer_name
                FROM Customers 
                WHERE phonenumber = %s AND otp = %s
            """
            cursor.execute(query, (phone_number, otp))
            user = cursor.fetchone()

            if not user:
                return jsonify({'error': 'Phone number or OTP invalid'}), 404

            # Update the password
            update_query = "UPDATE Customers SET password = %s WHERE customer_id = %s"
            cursor.execute(update_query, (new_password, user['customer_id']))
            mysql.commit()

            return jsonify({'message': 'Password updated successfully', "customer_name": user["customer_name"]}), 200

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500

    finally:
        # Ensure the database connection is properly closed
        mysql.close()


@app.route('/api/login_password', methods=['POST'])
def login_password():
    data = request.json
    phone_number = data.get('phone_number')
    password = data.get('password')

    if not phone_number or not password:
        return jsonify({'error': 'Phone number and password are required'}), 400

    # Query database to verify credentials
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = "SELECT * FROM Customers WHERE phonenumber = %s AND password = %s"
            cursor.execute(query, (phone_number,password))
            user = cursor.fetchone()

            if user:
                # Update last login date
                update_query = "UPDATE Customers SET last_login_date = %s WHERE customer_id = %s"
                cursor.execute(update_query, (datetime.now(), user['customer_id']))
                mysql.commit()

                # Generate JWT token
                token = jwt.encode({'customer_id': user['customer_id']}, app.config['SECRET_KEY'], algorithm="HS256")
                
                return jsonify({
                    'token': token,
                    'customer_id': user['customer_id'],
                    'customer_name': user['customer_name'],
                    'email': user['email']
                }), 200
            else:
                return jsonify({'error': 'Invalid credentials'}), 401

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': 'An error occurred'}), 500


@app.route('/api/update_profile', methods=['POST'])
@token_required
def update_profile(current_user):
    data = request.json

    if not data:
        return jsonify({"message": "No data provided"}), 400

    customer_id = current_user
    if not customer_id:
        return jsonify({"message": "customer_id is required"}), 400

    # Build the dynamic SQL UPDATE statement
    update_fields = []
    update_values = []
    for field in [
        'customer_name', 'email', 'billing_address', 'pincode',
        'state', 'city', 'dob', 'profile_picture', "phonenumber"
    ]:
        if field in data:
            update_fields.append(f"{field} = %s")
            update_values.append(data[field])

    if not update_fields:
        return jsonify({"message": "No fields to update"}), 400

    update_values.append(customer_id)  # Append the customer_id for the WHERE clause
    update_query = f"""
    UPDATE Customers
    SET {', '.join(update_fields)}
    WHERE customer_id = %s
    """

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            cursor.execute(update_query, update_values)
            mysql.commit()


        return jsonify({"message": "Profile updated successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while updating the profile"}), 500

@app.route('/api/update_prescription', methods=['POST'])
@token_required
def update_prescription(customer_id):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    prescription_image_url = data.get('prescription_image_url')
    prescription_date = data.get('prescription_date')
    prescription_status = data.get('prescription_status')
    prescription_comments = data.get('prescription_comments', '')
    prescription_name = data.get("prescription_name", "")

    if not all([prescription_image_url, prescription_date]):
        return jsonify({"message": "Missing required fields"}), 400

    insert_query = """
    INSERT INTO Prescription (prescription_name, prescription_image_url, prescription_date, prescription_status, prescription_comments, customer_id)
    VALUES (%s, %s, %s, %s, %s, %s)
    """

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            cursor.execute(insert_query, (prescription_name, prescription_image_url, prescription_date, prescription_status, prescription_comments, customer_id))
            mysql.commit()
            last_inserted_id = cursor.lastrowid


        return jsonify({"message": "Prescription inserted successfully", "prescription_id": last_inserted_id}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while inserting the prescription"}), 500

@app.route('/api/update_prescription_comments', methods=['PUT'])
@token_required
def update_prescription_comments(customer_id):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    prescription_id = data.get('prescription_id')
    prescription_comments = data.get('prescription_comments', '')

    if not prescription_id:
        return jsonify({"message": "Missing prescription_id"}), 400

    update_query = """
    UPDATE Prescription
    SET prescription_comments = %s
    WHERE prescription_id = %s AND customer_id = %s
    """

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            cursor.execute(update_query, (prescription_comments, prescription_id, customer_id))
            mysql.commit()

            if cursor.rowcount == 0:
                return jsonify({"message": "No prescription found with the given ID for the customer"}), 404

        return jsonify({"message": "Prescription comments updated successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while updating the prescription comments"}), 500

@app.route('/api/place_prescription', methods=['POST'])
@token_required
def place_prescription(customer_id):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    prescription_id = data.get("prescription_id", "")

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            
            insert_query = """
            UPDATE Prescription SET prescription_status='ORDER_PLACED' WHERE prescription_id=%s
            """

            cursor.execute(insert_query, (prescription_id,))
            mysql.commit()

            product_id = 38743
            quantity = 1

            # Check if the customer has an existing cart
            query = "SELECT cart_id FROM Cart WHERE customer_id = %s AND cart_status IN ('active', 'pending_confirm', 'confirm')"
            cursor.execute(query, (customer_id,))
            cart = cursor.fetchone()
            if cart:
                cart_id = cart['cart_id']
                # Update existing cart
                query = "UPDATE Cart SET product_ids_qty = CONCAT(IFNULL(product_ids_qty, ''), %s, ':', %s, ';'), cart_status = 'pending_confirm', prescription_id = %s WHERE cart_id = %s"
                cursor.execute(query, (product_id, quantity, prescription_id, cart_id))
            else:
                # Create new cart
                query = "INSERT INTO Cart (customer_id, cart_status, product_ids_qty, prescription_id) VALUES (%s, 'pending_confirm', %s, %s)"
                cursor.execute(query, (customer_id, f"{product_id}:{quantity};", prescription_id))
                cart_id = cursor.lastrowid

            mysql.commit()

        create_notification_to_admin(customer_id, "New prescription order placed", f"/admin/customer-detail/{customer_id}", "prescription_order")

        return jsonify({"message": "Prescription placed successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while placing the prescription"}), 500

@app.route("/api/update_presc_assoc", methods=["POST"])
@token_required
def update_presc_assoc(customer_id):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    prescription_id = data.get("prescription_id", "")
    product_ids = data.get("product_ids", "")

    update_query = """
    UPDATE Prescription SET associated_products=%s WHERE prescription_id=%s
    """

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            cursor.execute(update_query, (product_ids, prescription_id))
            mysql.commit()

        return jsonify({"message": "Prescription associated products updated successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while updating the prescription associated products"}), 500

@app.route('/api/list_prescriptions', methods=['GET', "POST"])
@token_required
def list_prescriptions(customer_id):

    select_query = """
    SELECT prescription_name, prescription_id, prescription_image_url, prescription_date, prescription_status, prescription_comments, last_used_date, associated_products
    FROM Prescription
    WHERE customer_id = %s
    """

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            cursor.execute(select_query, (customer_id,))
            prescriptions = cursor.fetchall()

            for i, prescription in enumerate(prescriptions):
                prescription["associated_products"] = prescription["associated_products"].split(",")
                # Fetch associated products
                if prescription["associated_products"]:
                    product_ids = prescription["associated_products"]
                    for j, product_id in enumerate(product_ids):
                        cursor.execute("SELECT name FROM Products WHERE product_id = %s", (product_id,))
                        product = cursor.fetchone()
                        if product:
                            product_name = product["name"]
                            prescriptions[i]["associated_products"][j] = {"product_id": product_id, "product_name": product_name}

        return jsonify({"prescriptions": prescriptions}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": "An error occurred while retrieving prescriptions"}), 500


@app.route('/api/get_profile', methods=['GET'])
@token_required
def get_profile(current_user):
    print(current_user)
    customer_id = current_user

    if not customer_id:
        return jsonify({"message": "customer_id is required"}), 400

    # Define the SQL SELECT query
    select_query = """
    SELECT
        customer_name AS name,
        email,
        dob,
        phonenumber AS phone,
        total_mig_coins_available AS coins,
        'light' AS theme,  -- Assuming the theme is always 'light'
        profile_picture AS profilePicture
    FROM Customers
    WHERE customer_id = %s
    """

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            cursor.execute(select_query, (customer_id,))
            result = cursor.fetchone()

        if result:
            return jsonify(result), 200
        else:
            return jsonify({"message": "Profile not found"}), 404

    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while retrieving the profile"}), 500
@app.route('/api/update_address', methods=['POST'])
@token_required
def update_address(current_user):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    customer_id = current_user
    address_id = data.get('id')
    if not address_id:
        return jsonify({"message": "Address ID is required"}), 400

    new_address = data.get('address')
    if not new_address:
        return jsonify({"message": "Address data is required"}), 400

    try:
        mysql = get_mysql_connection()
        if not mysql:
            return jsonify({"message": "Database connection failed"}), 500
        
        cursor = mysql.cursor()

        # Update address in the Addresses table
        update_query = """
        UPDATE Addresses
        SET address1 = %s,
            name = %s,
            pincode = %s,
            state = %s,
            type = %s,
            `default` = %s,
            phone_number = %s
        WHERE id = %s AND customer_id = %s
        """
        cursor.execute(update_query, (
            new_address.get('address1'),
            new_address.get('name'),
            new_address.get('pincode'),
            new_address.get('state'),
            new_address.get('type'),
            new_address.get('default'),
            new_address.get('phone_number', ""),
            address_id,
            customer_id
        ))
        mysql.commit()
        cursor.close()
        mysql.close()

        return jsonify({"message": "Address updated successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while updating the address"}), 500
@app.route('/api/add_address', methods=['POST'])
@token_required
def add_address(current_user):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    new_address = data.get('address')
    if not new_address:
        return jsonify({"message": "Address data is required"}), 400

    try:
        mysql = get_mysql_connection()
        if not mysql:
            return jsonify({"message": "Database connection failed"}), 500

        cursor = mysql.cursor()

        # Insert new address into the Addresses table
        insert_query = """
        INSERT INTO Addresses (customer_id, address1, name, pincode, state, type, `default`, phone_number)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(insert_query, (
            current_user,
            new_address.get('address1'),
            new_address.get('name'),
            new_address.get('pincode'),
            new_address.get('state'),
            new_address.get('type'),
            False,  # New address is default,
            new_address.get('phone_number', "")
        ))
        mysql.commit()
        cursor.close()
        mysql.close()

        return jsonify({"message": "Address added successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while adding the address"}), 500
    
@app.route('/api/delete_address', methods=['POST'])
@token_required
def delete_address(current_user):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    address_id = data.get('id')
    if not address_id:
        return jsonify({"message": "Address ID is required"}), 400

    try:
        mysql = get_mysql_connection()
        if not mysql:
            return jsonify({"message": "Database connection failed"}), 500

        cursor = mysql.cursor()

        # Delete address from the Addresses table
        delete_query = """
        DELETE FROM Addresses
        WHERE id = %s AND customer_id = %s
        """
        cursor.execute(delete_query, (address_id, current_user))
        mysql.commit()
        cursor.close()
        mysql.close()

        return jsonify({"message": "Address deleted successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while deleting the address"}), 500

@app.route('/api/delete_prescription', methods=['POST'])
@token_required
def delete_prescription(current_user):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    prescription_id = data.get('id')
    if not prescription_id:
        return jsonify({"message": "Prescription ID is required"}), 400

    try:
        mysql = get_mysql_connection()
        if not mysql:
            return jsonify({"message": "Database connection failed"}), 500

        cursor = mysql.cursor()

        # Delete prescription from the Prescriptions table
        delete_query = """
        DELETE FROM Prescription
        WHERE prescription_id = %s AND customer_id = %s
        """
        print(delete_query, prescription_id, current_user)
        cursor.execute(delete_query, (prescription_id, current_user))
        mysql.commit()
        cursor.close()
        mysql.close()

        return jsonify({"message": "Prescription deleted successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while deleting the prescription"}), 500

@app.route('/api/list_addresses', methods=['GET'])
@token_required
def list_addresses(current_user):
    print("list address", current_user)
    try:
        mysql = get_mysql_connection()
        if not mysql:
            return jsonify({"message": "Database connection failed"}), 500

        cursor = mysql.cursor()

        # Query to get the list of addresses
        select_query = """
        SELECT id, address1, name, pincode, state, type, `default`, phone_number
        FROM Addresses
        WHERE customer_id = %s
        """
        
        cursor.execute(select_query, (current_user,))
        result = cursor.fetchall()
        cursor.close()
        mysql.close()

        if result:
            addresses = [dict(row) for row in result]
            return jsonify({"addresses": addresses}), 200
        else:
            return jsonify({"addresses": [],  "message": "No addresses found"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while retrieving the addresses"}), 500
@app.route('/api/select_address', methods=['POST'])
@token_required
def select_address(current_user):
    data = request.json
    if not data:
        return jsonify({"message": "No data provided"}), 400

    address_id = data.get('id')
    if not address_id:
        return jsonify({"message": "Address ID is required"}), 400

    try:
        mysql = get_mysql_connection()
        if not mysql:
            return jsonify({"message": "Database connection failed"}), 500

        cursor = mysql.cursor()

        # Set the selected address as default and others as non-default
        update_query = """
        UPDATE Addresses
        SET `default` = CASE WHEN id = %s THEN TRUE ELSE FALSE END
        WHERE customer_id = %s
        """
        cursor.execute(update_query, (address_id, current_user))
        mysql.commit()
        cursor.close()
        mysql.close()

        return jsonify({"message": "Default address updated successfully"}), 200
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while updating the address"}), 500
@app.route('/api/get_default_address', methods=['GET'])
@token_required
def get_default_address(current_user):
    try:
        mysql = get_mysql_connection()
        if not mysql:
            return jsonify({"message": "Database connection failed"}), 500

        cursor = mysql.cursor()

        select_query = """
        SELECT * FROM Addresses
        WHERE customer_id = %s AND `default` = TRUE
        """
        cursor.execute(select_query, (current_user,))
        result = cursor.fetchone()
        cursor.close()
        mysql.close()

        if result:
            return jsonify({"default_address": result}), 200
        else:
            return jsonify({"message": "No default address found"}), 404
    except Exception as e:
        print(e)
        return jsonify({"message": "An error occurred while retrieving the default address"}), 500

@app.route('/api/rewards', methods=['GET'])
@token_required
def get_rewards(customer_id):
    try:
        page = int(request.args.get('page', 1))
        per_page = 10
        offset = (page - 1) * per_page

        mysql = get_mysql_connection()

        cursor = mysql.cursor()
        # Count total transactions
        cursor.execute("""
            SELECT COUNT(*) AS total_count 
            FROM RewardsTransaction
            WHERE customer_id = %s
        """, (customer_id,))
        total_count = cursor.fetchone()['total_count']

        # Fetch paginated transactions
        cursor.execute("""
            SELECT
                id,
                description,
                orderid,
                CONCAT(date, ' ', time) AS date_time,
                reward,
                iconType,
                amount,
                percentage,
                expires
            FROM RewardsTransaction
            WHERE customer_id = %s
            ORDER BY date DESC, time DESC
            LIMIT %s OFFSET %s
        """, (customer_id, per_page, offset))
        transactions = cursor.fetchall()

        transaction_list = []
        for transaction in transactions:
            # Parse the combined date_time field
            date_time = datetime.strptime(transaction['date_time'], "%Y-%m-%d %H:%M:%S")
            
            transaction_data = {
                "id": transaction['id'],
                "description": transaction['description'],
                "orderid": transaction['orderid'],
                "date": date_time.strftime("%Y-%m-%d"),
                "time": date_time.strftime("%H:%M:%S"),
                "reward": transaction['reward'],
                "iconType": transaction['iconType'],
                "amount": transaction['amount'],
                "percentage": transaction['percentage'],
                "expires": transaction['expires'].strftime("%Y-%m-%d")  # Assuming expires is a date
            }
            transaction_list.append(transaction_data)

        return jsonify({
            "customer_id": customer_id,
            "transactions": transaction_list,
            "total_pages": (total_count + per_page - 1) // per_page,
            "current_page": page,
            "has_next": page < (total_count + per_page - 1) // per_page,
            "has_prev": page > 1
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/api/rewards-summary', methods=['GET'])
@token_required
def get_rewards_summary(customer_id):
    print(customer_id)
    try:
        mysql = get_mysql_connection()
        cursor = mysql.cursor()

        # Define the date one month from now
        one_month_from_now = datetime.now() + timedelta(days=30)
        formatted_one_month_from_now = one_month_from_now.strftime("%Y-%m-%d")

        # Fetch total rewards for the customer
        cursor.execute("""
            SELECT SUM(reward) AS total_amount 
            FROM RewardsTransaction 
            WHERE iconType = 'primary' AND customer_id = %s
        """, (customer_id,))
        total_rewards = cursor.fetchone()['total_amount'] or 0
        print(total_rewards)

        # Fetch total redemptions for the customer
        cursor.execute("""
            SELECT SUM(reward) AS total_amount 
            FROM RewardsTransaction 
            WHERE iconType = 'secondary' AND customer_id = %s
        """, (customer_id,))
        total_redemptions = cursor.fetchone()['total_amount']
        if not total_redemptions:
            total_redemptions = 0
        total_redemptions = -total_redemptions
        

        # Fetch total expiring rewards for the customer
        cursor.execute("""
            SELECT SUM(reward) AS total_amount 
            FROM RewardsTransaction 
            WHERE iconType = 'primary' AND customer_id = %s AND expires <= %s AND redeemed = 0
        """, (customer_id, formatted_one_month_from_now))
        expiring_rewards = cursor.fetchone()['total_amount'] or 0

        return jsonify({
            "available": "{:.2f}".format(total_rewards - total_redemptions),
            "overall": "{:.2f}".format(total_rewards),
            "expiring": "{:.2f}".format(expiring_rewards)
        }), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500


# Add Reward API
@app.route("/api/complete_mig_payment", methods=["POST"])
@token_required
def complete_mig_payment(customer_id):
    try:
        data = request.json
        cart_id = data.get("cart_id")
        total_amount = data.get("total_amount")
        coupon_code_used = data.get("coupon_code_used")

       
        connection = get_mysql_connection()
        cursor = connection.cursor()



        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({"message": "MIG payment done!"}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500

# Add Reward API
@app.route("/api/add-reward", methods=["POST"])
@token_required
def add_reward(customer_id):
    try:
        data = request.json
        required_fields = ["description", "orderid", "customer_id", "reward", "amount", "percentage", "expires", "iconType"]
        
        # Validate required fields
        if not all(field in data and data[field] for field in required_fields):
            return jsonify({"message": "All fields are required!"}), 400

        connection = get_mysql_connection()
        cursor = connection.cursor()

        sql = """INSERT INTO RewardsTransaction (description, orderid, customer_id, date, time, reward, iconType, amount, percentage, expires, redeemed) 
                 VALUES (%s, %s, %s, CURDATE(), CURTIME(), %s, %s, %s, %s, %s, 0)"""
        cursor.execute(sql, (
            data["description"],
            data["orderid"],
            data["customer_id"],
            data["reward"],
            data["iconType"],
            data["amount"],
            data["percentage"],
            data["expires"]
        ))

        connection.commit()
        cursor.close()
        connection.close()

        return jsonify({"message": "Reward added successfully!"}), 201
    except Exception as e:
        return jsonify({"message": str(e)}), 500

# Delete Reward API
@app.route("/api/delete-reward/<int:reward_id>", methods=["DELETE"])
@token_required
def delete_reward(admin_id, reward_id):
    try:
        connection = get_mysql_connection()
        cursor = connection.cursor()

        # Check if the reward exists
        cursor.execute("SELECT * FROM RewardsTransaction WHERE id = %s", (reward_id,))
        reward = cursor.fetchone()
        if not reward:
            return jsonify({"message": "Reward transaction not found!"}), 404

        # Delete reward transaction
        cursor.execute("DELETE FROM RewardsTransaction WHERE id = %s", (reward_id,))
        connection.commit()

        cursor.close()
        connection.close()

        return jsonify({"message": "Reward deleted successfully!"}), 200
    except Exception as e:
        return jsonify({"message": str(e)}), 500

@app.route('/api/customers', methods=['POST'])
@token_required
def get_customers(current_user):
    connection = get_mysql_connection()
    search_text = request.json.get("searchtext", "").strip()  # Get search text and strip whitespace
    page = int(request.json.get('page', 1))  # Default page is 1
    limit = int(request.json.get('limit', 10))  # Default limit is 10
    sort_column = request.json.get('sortColumn', 'customer_id')  # Sort by column
    sort_direction = request.json.get('sortDirection', 'asc')  # Sort direction (asc/desc)

    offset = (page - 1) * limit

    valid_sort_columns = ['customer_id', 'customer_name', 'register_date_time', 'email', 'phonenumber', 'state', 'total_order']
    if sort_column not in valid_sort_columns:
        sort_column = 'customer_id'  # Default to customer_id if invalid column is sent

    sort_query = f"{sort_column} {sort_direction}"  # Construct the sort query

    try:
        with connection.cursor() as cursor:
            # Count total customers matching the search criteria
            cursor.execute("""
                SELECT COUNT(*) FROM Customers
                WHERE 
                    customer_id LIKE %s OR
                    customer_name LIKE %s OR
                    email LIKE %s OR
                    phonenumber LIKE %s OR
                    state LIKE %s
            """, tuple(f"%{search_text}%" for _ in range(5)))  # Use LIKE for search
            
            total_customers = cursor.fetchone()['COUNT(*)']

            # Fetch customers matching the search criteria
            cursor.execute(f"""
                SELECT 
                    c.customer_id, 
                    c.customer_name, 
                    c.register_date_time, 
                    c.email, 
                    c.phonenumber, 
                    c.profile_picture, 
                    c.state,
                    COUNT(cart.cart_id) AS total_order
                FROM 
                    Customers c
                LEFT JOIN 
                    Cart cart ON c.customer_id = cart.customer_id AND cart.cart_status != 'active'
                WHERE 
                    c.customer_id LIKE %s OR
                    c.customer_name LIKE %s OR
                    c.email LIKE %s OR
                    c.phonenumber LIKE %s OR
                    c.state LIKE %s
                GROUP BY 
                    c.customer_id
                ORDER BY {sort_query}  -- Apply sorting
                LIMIT %s OFFSET %s
            """, (*tuple(f"%{search_text}%" for _ in range(5)), limit, offset))  # Use LIMIT and OFFSET for pagination

            customers = cursor.fetchall()
    
        return jsonify({
            "customers": customers,
            "page": page,
            "limit": limit,
            "total_customers": total_customers
        }), 200

    except Exception as e:
        return jsonify({"error": "Internal Server Error"}), 500  # Return 500 status code
    finally:
        connection.close()

@app.route('/api/customers', methods=['PUT'])
@token_required
def add_customer(current_user):
    data = request.json
    customer_name = data['customer_name']
    email = data['email']
    phonenumber = data['phonenumber']
    country = data['state']
    
    connection = get_mysql_connection()
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO Customers (customer_name, email, phonenumber, state) VALUES (%s, %s, %s, %s)",
                       (customer_name, email, phonenumber, country))
        connection.commit()
    connection.close()

    return jsonify({"message": "Customer added successfully"}), 201

@app.route('/api/customers/<int:customer_id>', methods=['PATCH'])
@token_required
def edit_customer(current_user, customer_id):
    data = request.json
    customer_name = data['customer_name']
    email = data['email']
    phonenumber = data['phonenumber']
    register_date_time = data['register_date_time']
    country = data['state']
    
    connection = get_mysql_connection()
    with connection.cursor() as cursor:
        cursor.execute("UPDATE Customers SET customer_name = %s, email = %s, phonenumber = %s, register_date_time = %s, state = %s WHERE customer_id = %s",
                       (customer_name, email, phonenumber, register_date_time, country, customer_id))
        connection.commit()
    connection.close()

    return jsonify({"message": "Customer updated successfully"}), 200

@app.route('/api/all_categories', methods=['GET'])
def get_all_categories():
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT category_id, category_name, category_description, category_image_url, category_outline_url,
                       category_datetime_created, display_name, show_on_home
                FROM Category
                ORDER BY category_datetime_created DESC
            """
            cursor.execute(query)
            categories = cursor.fetchall()
        return jsonify(categories), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/add_category', methods=['POST'])
def add_category():
    data = request.get_json()
    required_fields = ['category_name', 'category_description', 'category_image_url', 'display_name', 'show_on_home', "category_outline_url"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = """
                INSERT INTO Category (category_name, category_description, category_image_url,
                                      category_datetime_created, display_name, show_on_home)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                data['category_name'],
                data['category_description'],
                data['category_image_url'],
                datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S'),
                data['display_name'],
                data['show_on_home']
            ))
            mysql.commit()
        return jsonify({"message": "Category added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/edit_category/<int:category_id>', methods=['PUT'])
def edit_category(category_id):
    data = request.get_json()
    fields = ['category_name', 'category_description', 'category_image_url', 'display_name', 'show_on_home', "category_outline_url"]
    update_fields = {field: data[field] for field in fields if field in data}

    if not update_fields:
        return jsonify({"error": "No fields to update"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            set_clause = ", ".join([f"{field} = %s" for field in update_fields.keys()])
            values = list(update_fields.values())
            values.append(category_id)
            query = f"""
                UPDATE Category
                SET {set_clause}
                WHERE category_id = %s
            """
            cursor.execute(query, values)
            mysql.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "Category not found"}), 404
        return jsonify({"message": "Category updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/delete_category/<int:category_id>', methods=['DELETE'])
def delete_category(category_id):
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = "DELETE FROM Category WHERE category_id = %s"
            cursor.execute(query, (category_id,))
            mysql.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "Category not found"}), 404
        return jsonify({"message": "Category deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/all_blog_categories', methods=['GET'])
def get_all_blog_categories():
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT id, category_name, category_display_name, category_image_url, 
                       category_description, category_on_home
                FROM BlogCategories
                ORDER BY id DESC
            """
            cursor.execute(query)
            categories = cursor.fetchall()
        return jsonify(categories), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()
        

@app.route('/api/product_upload_status', methods=['GET'])
def product_upload_status():
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT created_by, COUNT(created_by) FROM Products GROUP BY created_by;
            """
            cursor.execute(query)
            status = cursor.fetchall()
        return jsonify(status), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/add_blog_category', methods=['POST'])
def add_blog_category():
    data = request.get_json()
    required_fields = ['category_name', 'category_display_name', 'category_image_url', 'category_description', 'category_on_home']
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = """
                INSERT INTO BlogCategories (category_name, category_display_name, category_image_url, 
                                            category_description, category_on_home)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                data['category_name'],
                data['category_display_name'],
                data['category_image_url'],
                data['category_description'],
                data['category_on_home']
            ))
            mysql.commit()
        return jsonify({"message": "Blog category added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/edit_blog_category/<int:category_id>', methods=['PUT'])
def edit_blog_category(category_id):
    data = request.get_json()
    fields = ['category_name', 'category_display_name', 'category_image_url', 'category_description', 'category_on_home']
    update_fields = {field: data[field] for field in fields if field in data}

    if not update_fields:
        return jsonify({"error": "No fields to update"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            set_clause = ", ".join([f"{field} = %s" for field in update_fields.keys()])
            values = list(update_fields.values())
            values.append(category_id)
            query = f"""
                UPDATE BlogCategories
                SET {set_clause}
                WHERE id = %s
            """
            cursor.execute(query, values)
            mysql.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "Blog category not found"}), 404
        return jsonify({"message": "Blog category updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/delete_blog_category/<int:category_id>', methods=['DELETE'])
def delete_blog_category(category_id):
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = "DELETE FROM BlogCategories WHERE id = %s"
            cursor.execute(query, (category_id,))
            mysql.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "Blog category not found"}), 404
        return jsonify({"message": "Blog category deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/get_salt', methods=['POST'])
def get_salt():
    data = request.get_json()
    salt_name = data.get('salt_name')
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT id, composition_code, composition, description_url, rc, packaging
                FROM composition_code
                WHERE composition = %s
                ORDER BY id DESC
            """
            cursor.execute(query, (salt_name,))
            salt = cursor.fetchone()
        return jsonify(salt), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/all_composition_codes', methods=['GET'])
def get_all_composition_codes():
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT id, composition_code, composition, description_url, rc, packaging
                FROM composition_code
                ORDER BY id DESC
            """
            cursor.execute(query)
            composition_codes = cursor.fetchall()
        return jsonify(composition_codes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/search_composition_code', methods=['POST'])
def search_composition_code():
    search_term = request.json.get('search_term')
    if not search_term:
        return jsonify({"error": "Search term is required"}), 400

    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Use SQL LOCATE for ordering by closest match
            query = """
                SELECT 
                    id, 
                    composition_code, 
                    composition, 
                    description_url, 
                    rc, 
                    packaging,
                    LOCATE(%s, composition) AS position,
                    LENGTH(composition) AS length
                FROM composition_code
                WHERE 
                    composition LIKE %s
                ORDER BY length ASC, position DESC,  id DESC
                LIMIT 5
            """
            wildcard_term = f"%{search_term}%"
            cursor.execute(query, (search_term, wildcard_term))
            composition_codes = cursor.fetchall()

        return jsonify(composition_codes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/get_composition_code/', methods=['POST'])
def get_composition_code():

    composition_code = request.json.get('composition_code')
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT id, composition_code, composition, description_url, rc, packaging
                FROM composition_code
                WHERE composition_code = %s
                ORDER BY id DESC
            """
            cursor.execute(query, (composition_code,))
            composition_codes = cursor.fetchall()
        return jsonify(composition_codes), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/add_composition_code', methods=['POST'])
def add_composition_code():
    data = request.get_json()
    required_fields = ['composition_code', 'composition', 'description_url', 'rc', 'packaging']
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = """
                INSERT INTO composition_code (composition_code, composition, description_url, rc, packaging)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                data['composition_code'],
                data['composition'],
                data['description_url'],
                data['rc'],
                data['packaging']
            ))
            
            cursor.execute(
                    "UPDATE Products SET long_description = %s, composition_code = %s WHERE composition = %s",
                    (data['description_url'], data['composition_code'], data['composition'])
                )

            mysql.commit()
        return jsonify({"message": "Composition Code added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/edit_composition_code/<int:id>', methods=['PUT'])
def edit_composition_code(id):
    data = request.get_json()
    fields = ['composition_code', 'composition', 'description_url', 'rc', 'packaging']
    update_fields = {field: data[field] for field in fields if field in data}

    if not update_fields:
        return jsonify({"error": "No fields to update"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            set_clause = ", ".join([f"{field} = %s" for field in update_fields.keys()])
            values = list(update_fields.values())
            values.append(id)
            query = f"""
                UPDATE composition_code
                SET {set_clause}
                WHERE id = %s
            """
            cursor.execute(query, values)
            if "description_url" in update_fields and data["applyall"]:
                cursor.execute(
                    "UPDATE Products SET long_description = %s, composition_code = %s WHERE composition = %s",
                    (update_fields['description_url'], update_fields['composition_code'], update_fields['composition'])
                )
            mysql.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "Composition Code not found"}), 404
        return jsonify({"message": "Composition Code updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/delete_composition_code/<int:id>', methods=['DELETE'])
def delete_composition_code(id):
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = "DELETE FROM composition_code WHERE id = %s"
            cursor.execute(query, (id,))
            mysql.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "Composition Code not found"}), 404
        return jsonify({"message": "Composition Code deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route("/sitemap.html", methods=["GET"])
def render_sitemap():
    static_routes = [
        "https://medingen.in/",
        "https://medingen.in/dashboard",
        "https://medingen.in/offers",
        "https://medingen.in/rewards",
        "https://medingen.in/profile",
        "https://medingen.in/orders",
        "https://medingen.in/privacy-policy",
        "https://medingen.in/notification",
        "https://medingen.in/terms-and-conditions",
        "https://medingen.in/reminder",
        "https://medingen.in/cart",
        "https://medingen.in/blogs",
        "https://medingen.in/about"
    ]
    
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Fetch blog URLs
            cursor.execute("SELECT blog_name, blog_url FROM Blogs WHERE 1=1 AND visibility_status = 'Published' ORDER BY blog_rc_priority ASC")
            blog_routes = [(row['blog_name'], f"https://medingen.in/blogs/{row['blog_url']}") for row in cursor.fetchall()]
            
            # Fetch product URLs
            cursor.execute("SELECT categories, product_name_url FROM Products")
            product_routes = [f"https://medingen.in/product/{row['product_name_url']}" for row in cursor.fetchall()]
            
            # Fetch composition URLs
            cursor.execute("SELECT composition FROM composition_code")
            composition_routes = [f"https://medingen.in/salt/{row['composition']}" for row in cursor.fetchall()]
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

    # Organize URLs alphabetically for Salt and Product pages
    salt_routes = sorted(composition_routes)
    product_routes = sorted(product_routes)

    # Helper function to group routes by their initial alphabet letter
    def group_by_letter(routes, index=4):
        grouped = {}
        for route in routes:
            try:
                first_letter = route.split("/")[index][0].upper()  # Get the first letter of the last part of URL
                if first_letter not in grouped:
                    grouped[first_letter] = []
                grouped[first_letter].append(route)
            except IndexError:
                continue  # Skip the URLs that don't have enough segments
        return grouped

    salt_grouped = group_by_letter(salt_routes)
    product_grouped = group_by_letter(product_routes, 4)

    # HTML content for the sitemap page
    html_content = """
    <html>
    <head><title>Sitemap</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f4f4f4;
        }
        h1 {
            color: #333;
        }
        h2, h3 {
            color: #0056b3;
        }
        .container {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            max-width: 100%;
            padding: 10px;
        }
        .table {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 10px;
            border: 1px solid #ddd;
            padding: 10px;
            background-color: #fff;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }
        .table div {
            padding: 10px 0;
            text-align: center;
            word-wrap: break-word;
            border: 1px solid #ddd;
        }
        a {
            color: #0066cc;
            text-decoration: none;
            word-wrap: break-word;
        }
        a:hover {
            text-decoration: underline;
        }
        @media screen and (max-width: 768px) {
            .container {
                grid-template-columns: 1fr 1fr;
            }
            .table {
                grid-template-columns: 1fr;
            }
            .table div {
                font-size: 14px;
                padding: 8px;
            }
            h2, h3 {
                font-size: 16px;
            }
        }
    </style>
    </head>
    <body>
    <h1>Sitemap for medingen.in</h1>
    
    <h2>General Pages</h2>
    <div class="container">
    """
    for url in static_routes:
        try:
            html_content += f"  <div><a href='{url}'>{url}</a></div>\n"
        except IndexError:
            continue  # Skip if the index doesn't exist
    html_content += "</div>\n"

    html_content += "<h2>Blog Pages</h2>\n"
    for url in blog_routes:
        try:
            html_content += f"  <div><a href='{url[1]}'>{url[0]}</a></div>\n"
        except IndexError:
            continue  # Skip if the index doesn't exist
    html_content += "</div>\n"

    
    # Salt pages section (A-Z)
    html_content += "<h2>Salt Pages (A-Z)</h2>\n"
    for letter in sorted(salt_grouped.keys()):
        html_content += f"<h3>{letter}</h3>\n"
        html_content += "<div class='table'>\n"
        for url in salt_grouped[letter]:
            try:
                url_part = url.split("/")[4]  # Extracting the relevant part
                html_content += f"    <div><a href='{url}'>{url_part}</a></div>\n"
            except IndexError:
                continue  # Skip if the index doesn't exist
        html_content += "</div>\n"

    # Product pages section (A-Z)
    html_content += "<h2>Product Pages (A-Z)</h2>\n"
    for letter in sorted(product_grouped.keys()):
        html_content += f"<h3>{letter}</h3>\n"
        html_content += "<div class='table'>\n"
        for url in product_grouped[letter]:
            try:
                url_part = url.split("/")[4]  # Extracting the relevant part
                html_content += f"    <div><a href='{url}'>{url_part}</a></div>\n"
            except IndexError:
                continue  # Skip if the index doesn't exist
        html_content += "</div>\n"
    
    html_content += "</body></html>"

    return Response(html_content, mimetype="text/html")


@app.route("/sitemap.xml", methods=["GET"])
def generate_sitemap():
    static_routes = [
                "https://medingen.in/",
        "https://medingen.in/dashboard",
        "https://medingen.in/offers",
        "https://medingen.in/rewards",
        "https://medingen.in/profile",
        "https://medingen.in/orders",
        "https://medingen.in/privacy-policy",
        "https://medingen.in/notification",
        "https://medingen.in/terms-and-conditions",
        "https://medingen.in/reminder",
        "https://medingen.in/cart",
        "https://medingen.in/blogs",
        "https://medingen.in/about"

    ]
    
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Fetch blog URLs
            cursor.execute("SELECT blog_url FROM Blogs WHERE 1=1 AND visibility_status = 'Published' ORDER BY blog_rc_priority ASC")
            blog_routes = [f"https://medingen.in/blogs/{row['blog_url']}" for row in cursor.fetchall()]
            
            # Fetch product URLs
            cursor.execute("SELECT categories, product_name_url FROM Products")
            product_routes = [f"https://medingen.in/product/{row['product_name_url']}" for row in cursor.fetchall()]
            
            # Fetch composition URLs
            cursor.execute("SELECT composition FROM composition_code")
            composition_routes = [f"https://medingen.in/salt/{row['composition']}" for row in cursor.fetchall()]
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

    # Combine all URLs
    all_urls = static_routes + blog_routes + product_routes + composition_routes

    # Generate XML format
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for url in all_urls:
        xml_content += f"  <url>\n    <loc>{url}</loc>\n  </url>\n"
    xml_content += "</urlset>"

    return Response(xml_content, mimetype="application/xml")


@app.route('/api/all_blogs', methods=['GET'])
def get_all_blogs():
    mysql = get_mysql_connection()
    popular = request.args.get('popular', False)
    category_id = request.args.get('category_id', None)  # Get the category_id from the request, if any
    show_hidden = request.args.get('show_hidden', False)

    if popular:
        order_col = "blog_visit_count"
        order_dir = "DESC"
    else:
        order_col = "blog_rc_priority"
        order_dir = "ASC"
    
    try:
        with mysql.cursor() as cursor:
            # Base query
            query = f"""
                SELECT id, blog_name, blog_image_url, blog_category_id, blog_description_url, blog_visit_count, 
                       blog_rc_priority, blog_created_date, blog_url, meta_keywords, meta_description, meta_title, 
                       meta_author, meta_author_title, meta_author_profile_url, visibility_status
                FROM Blogs WHERE 1=1
            """
            
            # Add filtering by category_id if provided
            if category_id:
                query += " AND blog_category_id = %s "
            
            if not show_hidden:
                query += " AND visibility_status = 'Published' "
            
            # Add the order by clause
            query += f" ORDER BY {order_col} {order_dir}"

            # Execute the query
            if category_id:
                cursor.execute(query, (category_id,))
            else:
                cursor.execute(query)

            blogs = cursor.fetchall()

        return jsonify(blogs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

# Fetch a single blog by blog_name
@app.route('/api/get_blog', methods=['POST'])
def get_blog():
    blog_name = request.json.get('blog_url')
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT id, blog_name, blog_image_url, blog_category_id, blog_description_url, blog_visit_count, blog_rc_priority, blog_created_date, meta_keywords, blog_url, meta_description, meta_title, meta_author, meta_author_title, meta_author_profile_url, visibility_status
                FROM Blogs
                WHERE blog_url = %s
                ORDER BY id DESC
            """
            cursor.execute(query, (blog_name,))
            blogs = cursor.fetchall()
        return jsonify(blogs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

# Add a new blog
@app.route('/api/add_blog', methods=['POST'])
def add_blog():
    data = request.get_json()
    required_fields = ['blog_name', 'blog_image_url', 'blog_category_id', 'blog_description_url', 'blog_visit_count', 'blog_rc_priority', "blog_url", "meta_author", "meta_author_title", "meta_author_profile_url", "visibility_status"]
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = """
                INSERT INTO Blogs (blog_name, blog_image_url, blog_category_id, blog_description_url, blog_visit_count, blog_rc_priority, meta_keywords, blog_url, meta_description, meta_title, meta_author, meta_author_title, meta_author_profile_url, visibility_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                data['blog_name'],
                data['blog_image_url'],
                data['blog_category_id'],
                data['blog_description_url'],
                data['blog_visit_count'],
                data['blog_rc_priority'],
                data["meta_keywords"],
                data["blog_url"],
                data["meta_description"],
                data["meta_title"],
                data["meta_author"],
                data["meta_author_title"],
                data["meta_author_profile_url"],
                data["visibility_status"]
            ))
            mysql.commit()
        return jsonify({"message": "Blog added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

# Edit an existing blog
@app.route('/api/edit_blog/<int:id>', methods=['PUT'])
def edit_blog(id):
    data = request.get_json()
    fields = ['blog_name', 'blog_image_url', 'blog_category_id', 'blog_description_url', 'blog_visit_count', 'blog_rc_priority', 'meta_keywords', "blog_url", "meta_description", "meta_title", "meta_author", "meta_author_title", "meta_author_profile_url", "visibility_status"]
    update_fields = {field: data[field] for field in fields if field in data}

    if not update_fields:
        return jsonify({"error": "No fields to update"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            set_clause = ", ".join([f"{field} = %s" for field in update_fields.keys()])
            values = list(update_fields.values())
            values.append(id)
            query = f"""
                UPDATE Blogs
                SET {set_clause}
                WHERE id = %s
            """
            cursor.execute(query, values)
            mysql.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "Blog not found"}), 404
        return jsonify({"message": "Blog updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

# Delete a blog by ID
@app.route('/api/delete_blog/<int:id>', methods=['DELETE'])
def delete_blog(id):
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = "DELETE FROM Blogs WHERE id = %s"
            cursor.execute(query, (id,))
            mysql.commit()
            if cursor.rowcount == 0:
                return jsonify({"error": "Blog not found"}), 404
        return jsonify({"message": "Blog deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/all_reminders', methods=['GET'])
@token_required
def get_all_reminders(customer_id):
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT 
                    r.id, 
                    r.start_date, 
                    r.end_date, 
                    r.reminder_time, 
                    r.product_ids, 
                    r.customer_id,
                    GROUP_CONCAT(rs.taken_datetime ORDER BY rs.taken_datetime DESC) AS taken_history
                FROM Reminders r
                LEFT JOIN ReminderStatus rs ON r.id = rs.reminder_id
                WHERE r.customer_id = %s
                GROUP BY r.id
                ORDER BY r.id DESC
            """
            cursor.execute(query, (customer_id,))
            reminders = cursor.fetchall()

            # Serialize datetime and timedelta fields
            for reminder in reminders:
                reminder['start_date'] = str(reminder['start_date']) if reminder['start_date'] else None
                reminder['end_date'] = str(reminder['end_date']) if reminder['end_date'] else None
                reminder['reminder_time'] = str(reminder['reminder_time']) if reminder['reminder_time'] else None
                reminder['taken_history'] = (
                    [dt for dt in reminder['taken_history'].split(",")]
                    if reminder['taken_history'] else []
                )
        return jsonify(reminders), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/mark_as_taken', methods=['POST'])
@token_required
def mark_as_taken(customer_id):
    data = request.get_json()
    reminder_id = data.get("reminder_id")

    if not reminder_id or not customer_id:
        return jsonify({"error": "reminder_id and customer_id are required"}), 400

    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Check if the reminder exists and belongs to the customer
            check_query = """
                SELECT id 
                FROM Reminders 
                WHERE id = %s AND customer_id = %s
            """
            cursor.execute(check_query, (reminder_id, customer_id))
            reminder = cursor.fetchone()

            if not reminder:
                return jsonify({"error": "Reminder not found or does not belong to the customer"}), 404

            # Insert the record into ReminderStatus
            insert_query = """
                INSERT INTO ReminderStatus (reminder_id, taken_datetime)
                VALUES (%s, NOW())
            """
            cursor.execute(insert_query, (reminder_id,))
            mysql.commit()

        return jsonify({"message": "Marked as taken successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()
from datetime import datetime, timedelta
@app.route('/api/check_reminder', methods=['POST'])
@token_required
def check_reminder_at_given_time(customer_id):
    data = request.get_json()
    given_time = data.get("given_time")  # Format: 'YYYY-MM-DD HH:MM:SS'

    if not given_time:
        return jsonify({"error": "given_time is required"}), 400

    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT 
                    r.id, 
                    r.start_date, 
                    r.end_date, 
                    r.reminder_time, 
                    r.product_ids, 
                    r.customer_id, 
                    GROUP_CONCAT(rs.taken_datetime ORDER BY rs.taken_datetime DESC) AS taken_history,
                    c.customer_name AS customer_name
                FROM Reminders r
                LEFT JOIN ReminderStatus rs ON r.id = rs.reminder_id
                JOIN Customers c ON r.customer_id = c.customer_id
                WHERE r.customer_id = %s
                AND r.start_date <= %s 
                AND r.end_date >= %s 
                GROUP BY r.id
            """
            cursor.execute(query, (customer_id, given_time, given_time))
            reminders = cursor.fetchall()

            active_reminders = []
            missed_reminders = []
            
            # Convert given_time string to datetime object
            given_datetime = datetime.strptime(given_time, '%Y-%m-%d %H:%M:%S')
            given_time_only = given_datetime.time()  # Extract the time part from the given datetime

            for reminder in reminders:
                reminder['start_date'] = str(reminder['start_date']) if reminder['start_date'] else None
                reminder['end_date'] = str(reminder['end_date']) if reminder['end_date'] else None
                reminder['reminder_time'] = str(reminder['reminder_time']) if reminder['reminder_time'] else None
                reminder['taken_history'] = (
                    [dt for dt in reminder['taken_history'].split(",")]
                    if reminder['taken_history'] else []
                )

                # Check if the given_datetime's date is already in taken_history
                taken_dates = {datetime.strptime(dt, "%Y-%m-%d %H:%M:%S").date() for dt in reminder['taken_history']}
                if given_datetime.date() in taken_dates:
                    continue  # Skip if the given date is already in taken_history

                reminder_time = datetime.strptime(str(reminder['reminder_time']), "%H:%M:%S").time()
                
                # Combine reminder_time with a placeholder date to compare times
                reminder_datetime = datetime.combine(datetime.today(), reminder_time)

                # Calculate the time difference to see if it's within the 15-minute buffer
                time_diff = abs((given_datetime - reminder_datetime).total_seconds())

                if time_diff <= 900:  # Within the 15-minute buffer
                    active_reminders.append(reminder)
                elif reminder_datetime < given_datetime:  # Past reminder (comparison with full datetime)
                    missed_reminders.append(reminder)

            return jsonify({
                "active_reminders": active_reminders,
                "missed_reminders": missed_reminders,
            }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()



@app.route('/api/delete_reminder', methods=['POST'])
@token_required
def delete_reminder(customer_id):
    data = request.get_json()
    reminder_id = data.get("reminder_id")

    if not reminder_id:
        return jsonify({"error": "reminder_id is required"}), 400

    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            delete_query = "DELETE FROM Reminders WHERE id = %s AND customer_id = %s"
            cursor.execute(delete_query, (reminder_id, customer_id))
            mysql.commit()
        return jsonify({"message": "Reminder deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/add_reminder', methods=['POST'])
@token_required
def add_reminder(customer_id):
    data = request.get_json()
    required_fields = ['start_date', 'end_date', 'time', 'products']
    
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    # Ensure that 'products' is a valid JSON format
    try:
        products = json.dumps(data['products'])  # Ensure products is serialized as a valid JSON string
    except TypeError:
        return jsonify({"error": "Invalid products format"}), 400

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            rem_time = datetime.strptime(data['time'], "%Y-%m-%dT%H:%M:%S.%fZ").replace(second=0, microsecond=0).time()
            query = """
                INSERT INTO Reminders (start_date, end_date, reminder_time, product_ids, customer_id)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                data['start_date'],
                data['end_date'],
                rem_time,
                products,  # Pass the serialized JSON
                customer_id
            ))
            mysql.commit()
            reminder_id = cursor.lastrowid

            cursor.execute("SELECT endpoint, p256dh, auth FROM PushSubscriptions WHERE user_id = %s", (customer_id,))
            subscriptions = cursor.fetchall()

            for subscription in subscriptions:
                message = "Hi, gentle reminder to take your medicine. Taking it now helps keep you on your path to wellness!"
                start_date = datetime.strptime(data['start_date'], "%Y-%m-%dT%H:%M:%S.%fZ").date()
                end_date = datetime.strptime(data['end_date'], "%Y-%m-%dT%H:%M:%S.%fZ").date()
                
                date_list = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") 
                                for i in range((end_date - start_date).days + 1)]

                for in_date in date_list:    

                    api_data = {
                        "payload": {
                            "title": "Medingen",
                            "body": message,
                            "icon": "/android-chrome-192x192.png",
                            "target_url": "https://medingen.in/reminder",
                            "reminder_id": reminder_id
                        },
                        "subscription": subscription,
                        "schedule_time": in_date + " " + rem_time.strftime("%H:%M:%S")
                    }
                    
                    api_url = f"http://ec2-13-127-4-200.ap-south-1.compute.amazonaws.com/send_notification_247832438"
                    response = requests.post(api_url, json=api_data)

        return jsonify({"message": "Reminder added successfully"}), 200
    except Exception as e:
        raise e
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()

@app.route('/api/patient_records', methods=['GET'])
@token_required
def get_patient_records(customer_id):
    """Fetch all patient records for a customer."""
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                SELECT id, name, age, gender, contact_info, medical_history 
                FROM PatientRecords 
                WHERE customer_id = %s
                ORDER BY id DESC
            """
            cursor.execute(query, (customer_id,))
            records = cursor.fetchall()
        return jsonify(records), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/add_patient_record', methods=['POST'])
@token_required
def add_patient_record(customer_id):
    """Add a new patient record."""
    data = request.get_json()
    required_fields = ['name', 'age', 'gender']

    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            query = """
                INSERT INTO PatientRecords (customer_id, name, age, gender, contact_info, medical_history)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                customer_id,
                data['name'],
                data['age'],
                data['gender'],
                data.get('contact_info', None),
                data.get('medical_history', None),
            ))
            mysql.commit()
        return jsonify({"message": "Patient record added successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/update_patient_record/<int:record_id>', methods=['PUT'])
@token_required
def update_patient_record(customer_id, record_id):
    """Update an existing patient record."""
    data = request.get_json()

    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Check if the record exists and belongs to the customer
            check_query = """
                SELECT id FROM PatientRecords WHERE id = %s AND customer_id = %s
            """
            cursor.execute(check_query, (record_id, customer_id))
            record = cursor.fetchone()

            if not record:
                return jsonify({"error": "Patient record not found or unauthorized"}), 404

            # Update record
            update_query = """
                UPDATE PatientRecords 
                SET name = %s, age = %s, gender = %s, contact_info = %s, medical_history = %s, updated_at = NOW()
                WHERE id = %s AND customer_id = %s
            """
            cursor.execute(update_query, (
                data.get('name', None),
                data.get('age', None),
                data.get('gender', None),
                data.get('contact_info', None),
                data.get('medical_history', None),
                record_id,
                customer_id,
            ))
            mysql.commit()

        return jsonify({"message": "Patient record updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/delete_patient_record/<int:record_id>', methods=['DELETE'])
@token_required
def delete_patient_record(customer_id, record_id):
    """Delete a patient record."""
    mysql = get_mysql_connection()
    try:
        with mysql.cursor() as cursor:
            # Check if the record exists and belongs to the customer
            check_query = """
                SELECT id FROM PatientRecords WHERE id = %s AND customer_id = %s
            """
            cursor.execute(check_query, (record_id, customer_id))
            record = cursor.fetchone()

            if not record:
                return jsonify({"error": "Patient record not found or unauthorized"}), 404

            # Delete record
            delete_query = """
                DELETE FROM PatientRecords WHERE id = %s AND customer_id = %s
            """
            cursor.execute(delete_query, (record_id, customer_id))
            mysql.commit()

        return jsonify({"message": "Patient record deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        mysql.close()


@app.route('/api/view_admin_orders', methods=['GET'])
@token_required
def view_admin_orders(current_user):
    try:
        # Retrieve query parameters for pagination and filters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        filters = {
            "cart_status": request.args.get('cart_status'),
            "customer_id": request.args.get('customer_id'),
            "delivery_address_id": request.args.get('delivery_address_id'),
            "prescription_id": request.args.get('prescription_id'),
            "customer_name": request.args.get('customer_name'),  # New filter for customer name
            "phonenumber": request.args.get('phonenumber')  # New filter for phone number
        }

        # Build SQL query with filters
        filter_conditions = []
        filter_values = []

        for key, value in filters.items():
            if value:
                if key in ["customer_name", "phonenumber"]:
                    # For customer_name, use LIKE for partial matches
                    filter_conditions.append(f"cu.{key} LIKE %s")
                    filter_values.append(f"%{value}%")  # Adding wildcards for partial match
                else:
                    filter_conditions.append(f"c.{key} LIKE %s")  # Apply LIKE for all filters
                    filter_values.append(f"%{value}%")  # Adding wildcards for partial match

        filter_query = " AND ".join(filter_conditions)
        filter_query = f"WHERE {filter_query}" if filter_conditions else ""

        # Calculate offset for pagination
        offset = (page - 1) * per_page

        # SQL query with filters and pagination
        query = f"""
        SELECT
            c.cart_id,
            c.customer_id,
            cu.customer_name,
            c.cart_created_date,
            c.cart_updated_date,
            c.cart_status,
            c.product_ids_qty,
            c.total_cart_value,
            c.delivery_address_id,
            c.prescription_id,
            cu.phonenumber
        FROM Cart c
        LEFT JOIN Customers cu ON c.customer_id = cu.customer_id
        {filter_query}
        ORDER BY c.cart_updated_date DESC
        LIMIT %s OFFSET %s
        """

        filter_values.extend([per_page, offset])

        # Execute query
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            cursor.execute(query, tuple(filter_values))
            orders = cursor.fetchall()

            # Count total rows for pagination
            cursor.execute(f"SELECT COUNT(*) as total FROM Cart c LEFT JOIN Customers cu ON c.customer_id = cu.customer_id {filter_query}", tuple(filter_values[:-2]))
            total_rows = cursor.fetchone()['total']

        # Transform the result
        for order in orders:
            order['num_products'] = sum(int(qty.split(':')[1]) for qty in order['product_ids_qty'].split(';') if qty)
            order['delivery_address_selected'] = "Yes" if int(order['delivery_address_id']) > 0 else "No"
            order['prescription_selected'] = "Yes" if int(order['prescription_id']) > 0 else "No"
            del order['product_ids_qty']

        return jsonify({
            "orders": orders,
            "pagination": {
                "current_page": page,
                "per_page": per_page,
                "total_pages": math.ceil(total_rows / per_page),
                "total_items": total_rows,
            }
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"message": "An error occurred while fetching orders"}), 500

@app.route('/api/save-subscription', methods=['POST'])
@token_required
def save_subscription(user_id):
    try:
        data = request.get_json()
        data = data["subscription"]
        # Validate the required fields
        required_fields = ['endpoint', 'keys']
        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing required fields"}), 400

        # Ensure `keys` contains `p256dh` and `auth`
        if not all(key in data['keys'] for key in ['p256dh', 'auth']):
            return jsonify({"error": "Missing required keys"}), 400

        # Extract subscription details
        endpoint = data['endpoint']
        p256dh = data['keys']['p256dh']
        auth = data['keys']['auth']

        # Save the subscription in the database
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = """
                INSERT INTO PushSubscriptions (user_id, endpoint, p256dh, auth)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE endpoint = VALUES(endpoint), p256dh = VALUES(p256dh), auth = VALUES(auth)
            """
            cursor.execute(query, (user_id, endpoint, p256dh, auth))
            mysql.commit()

        return jsonify({"message": "Subscription saved successfully"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'mysql' in locals():
            mysql.close()

def load_redirect_map():
    global redirect_map
    if redirect_map is None:
        print("Fetching redirect map from S3...")
        s3 = boto3.client('s3', region_name='ap-south-1' )
        obj = s3.get_object(Bucket='medingen-store', Key='redirects/redirect_map.json')
        redirect_map = json.loads(obj['Body'].read())
    return redirect_map

# Redirect old blog pages
@app.route('/blog/<path:path>', methods=['GET'])
def old_blog_handler(path):
    
    redirects = load_redirect_map()
    full_path = f"https://medingen.in/blog/{path}"
    if full_path in redirects:
        return redirect(redirects[full_path], code=302)
    else:
        return redirect("https://medingen.in/blogs/", code=302)

# Flask route for handling the /blogs/<path> URL
@app.route('/blogs/<path:path>', methods=['GET'])
def blog_handler(path):
    s3 = boto3.client('s3', region_name='ap-south-1' )
    
    redirects = load_redirect_map()
    full_path = f"https://medingen.in/blogs/{path}"
    if full_path in redirects:
        return redirect(redirects[full_path], code=302)

    # Fetch data from MySQL
    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = """
                SELECT id, blog_name, blog_image_url, blog_category_id, 
                       blog_description_url, blog_visit_count, blog_rc_priority, 
                       blog_created_date, meta_keywords, blog_url, meta_description, meta_title, 
                       meta_author, meta_author_title, meta_author_profile_url, blog_updated_date
                FROM Blogs
                WHERE blog_url = %s
                ORDER BY id DESC
            """
            cursor.execute(query, (path,))
            blogs = cursor.fetchall()

        # If no blog is found, set default values
        if not blogs:
            blog_data = {
                'blog_name': "Medingen Blogs",
                'meta_title': "Medingen Blog",
                'meta_description': "Medingen Online E-Commerce Platform for Generic medicines - Saves your health and wealth.",
                'meta_keywords': "",
                'blog_url': path,
                'blog_image_url': "medingen-logo.jpg",
                'meta_author': "Medingen Team",
                'meta_author_title': "",
                'meta_author_profile_url': "",
                'blog_created_date': "",
                'blog_updated_date': ""
            }
        else:
            # Use the first result if a blog is found
            blog_data = blogs[0]  # This is now a dictionary with column names as keys
            blog_data = {
                'blog_name': blog_data['blog_name'],
                "meta_title": blog_data['meta_title'] or blog_data['blog_name'],
                'meta_description': blog_data['meta_description'] or "Medingen Online E-Commerce Platform for Generic medicines - Saves your health and wealth.",
                'meta_keywords': blog_data['meta_keywords'] or "",
                'blog_url': blog_data['blog_url'],
                'blog_image_url': blog_data['blog_image_url'] or "medingen-logo.jpg",
                'meta_author': blog_data['meta_author'] or "Medingen Team",
                'meta_author_title': blog_data['meta_author_title'] or "",
                'meta_author_profile_url': blog_data['meta_author_profile_url'] or "",
                'blog_created_date': blog_data['blog_created_date'] or "",
                'blog_updated_date': blog_data['blog_updated_date'] or ""
            }

        # Fetch the index.html from S3
        response = s3.get_object(Bucket='medingen-in', Key='index.html')
        html = response['Body'].read().decode('utf-8')

        def update_or_add_meta(html, pattern, replacement, meta_tag):
            if re.search(pattern, html):
                return re.sub(pattern, replacement, html)
            else:
                head_close = '</head>'
                return html.replace(head_close, f"\n    {meta_tag}\n{head_close}")

        # Modify meta tags and title in the HTML
        modified_html = update_or_add_meta(
            html,
            r'<meta name="description" content=".*?">',
            f'<meta name="description" content="{blog_data["meta_description"]}">',
            f'<meta name="description" content="{blog_data["meta_description"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta name="keywords" content=".*?">',
            f'<meta name="keywords" content="{blog_data["meta_keywords"]}">',
            f'<meta name="keywords" content="{blog_data["meta_keywords"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta name="author" content=".*?">',
            f'<meta name="author" content="{blog_data["meta_author"]}">',
            f'<meta name="author" content="{blog_data["meta_author"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta name="robots" content=".*?">',
            '<meta name="robots" content="index, follow">',
            '<meta name="robots" content="index, follow">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta property="og:title" content=".*?">',
            f'<meta property="og:title" content="{blog_data["blog_name"]}">',
            f'<meta property="og:title" content="{blog_data["blog_name"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta property="og:description" content=".*?">',
            f'<meta property="og:description" content="{blog_data["meta_description"]}">',
            f'<meta property="og:description" content="{blog_data["meta_description"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta property="og:title" content=".*?">',
            f'<meta property="og:title" content="{blog_data["meta_title"]}">',
            f'<meta property="og:title" content="{blog_data["meta_title"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta property="og:url" content=".*?">',
            f'<meta property="og:url" content="https://medingen.in/blogs/{blog_data["blog_url"]}">',
            f'<meta property="og:url" content="https://medingen.in/blogs/{blog_data["blog_url"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta property="og:type" content=".*?">',
            '<meta property="og:type" content="article">',
            '<meta property="og:type" content="article">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta property="og:image" content=".*?">',
            f'<meta property="og:image" content="https://d26lh6sqkii1nb.cloudfront.net/blogs/images/{blog_data["blog_image_url"]}">',
            f'<meta property="og:image" content="https://d26lh6sqkii1nb.cloudfront.net/blogs/images/{blog_data["blog_image_url"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta name="twitter:card" content=".*?">',
            f'<meta name="twitter:card" content="https://d26lh6sqkii1nb.cloudfront.net/blogs/images/{blog_data["blog_image_url"]}">',
            f'<meta name="twitter:card" content="https://d26lh6sqkii1nb.cloudfront.net/blogs/images/{blog_data["blog_image_url"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta name="twitter:title" content=".*?">',
            f'<meta name="twitter:title" content="{blog_data["blog_name"]}">',
            f'<meta name="twitter:title" content="{blog_data["blog_name"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta name="twitter:description" content=".*?">',
            f'<meta name="twitter:description" content="{blog_data["meta_description"]}">',
            f'<meta name="twitter:description" content="{blog_data["meta_description"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<meta name="twitter:image" content=".*?">',
            f'<meta name="twitter:image" content="https://d26lh6sqkii1nb.cloudfront.net/blogs/images/{blog_data["blog_image_url"]}">',
            f'<meta name="twitter:image" content="https://d26lh6sqkii1nb.cloudfront.net/blogs/images/{blog_data["blog_image_url"]}">'
        )

        modified_html = update_or_add_meta(
            modified_html,
            r'<link rel="canonical" href=".*?">',
            f'<link rel="canonical" href="https://medingen.in/blogs/{blog_data["blog_url"]}">',
            f'<link rel="canonical" href="https://medingen.in/blogs/{blog_data["blog_url"]}">'
        )

        modified_html = modified_html + f'''
            <script type="application/ld+json">
            {{
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": "{blog_data["meta_title"]}",
                "description": "{blog_data["meta_description"]}",
                "image": "https://d26lh6sqkii1nb.cloudfront.net/blogs/images/{blog_data["blog_image_url"]}",
                "author": {{
                    "@type": "Person",
                    "name": "{blog_data["meta_author"]}",
                    "jobTitle": "{blog_data["meta_author_title"]}",
                    "url": "{blog_data["meta_author_profile_url"]}"
                }},
                "publisher": {{
                    "@type": "Organization",
                    "name": "Medingen",
                    "logo": {{
                        "@type": "ImageObject",
                        "url": "https://medingen.in/migfulllogo.png"
                    }}
                }},
                "datePublished": "{blog_data["blog_created_date"]}",
                "dateModified": "{blog_data["blog_updated_date"]}",
                "mainEntityOfPage": {{
                    "@type": "WebPage",
                    "@id": "https://medingen.in/blogs/{blog_data["blog_url"]}"
                }}
            }}
            </script>
            '''

        # Update the <title> tag with the blog name
        modified_html = re.sub(
            r'<title>.*?</title>',
            f'<title>{blog_data["blog_name"]} - Medingen</title>',
            modified_html
        )

        return Response(modified_html, mimetype='text/html')

    except Exception as e:
        # Log the error and print the stack trace
        error_message = f"Error fetching content: {str(e)}"
        stack_trace = traceback.format_exc()  # Capture the full stack trace
        print(f"{error_message}\n{stack_trace}")  # Print error message and stack trace to logs
        return Response(error_message, status=500)

@app.route('/product/<path:product_name>', methods=['GET'])
def product_handler(product_name):
    s3 = boto3.client('s3', region_name='ap-south-1')

    redirects = load_redirect_map()
    full_path = f"https://medingen.in/product/{product_name}"
    if full_path in redirects:
        return redirect(redirects[full_path], code=302)

    try:
        mysql = get_mysql_connection()
        with mysql.cursor() as cursor:
            query = """
                SELECT name AS product_name, product_id, 
                       JSON_UNQUOTE(JSON_EXTRACT(photo, '$[0].img')) AS image_url, 
                       meta_keywords, meta_description, meta_title, product_pricing_new as price,
                       CONCAT("https://medingen.in/product/", product_name_url) AS product_url
                FROM Products 
                WHERE product_name_url = %s;
            """
            cursor.execute(query, (product_name,))
            product = cursor.fetchone()

        # Default meta details if no product is found
        default_meta = {
            'product_name': "Medingen",
            'meta_title': "Medingen - High-Quality Products",
            'meta_description': "Explore our range of quality products at Medingen.",
            'meta_keywords': "",
            'product_url': f"https://medingen.in/product/{product_name}",
            'image_url': "medingen-logo.jpg",
            "price": "Unknown"
        }

        product_data = product if product else default_meta
        product_data['image_url'] = f"https://d26lh6sqkii1nb.cloudfront.net/products/{product_data['image_url']}"

        # Fetch the index.html from S3
        response = s3.get_object(Bucket='medingen-in', Key='index.html')
        html = response['Body'].read().decode('utf-8')

        def update_or_add_meta(html, pattern, replacement, meta_tag):
            if re.search(pattern, html):
                return re.sub(pattern, replacement, html)
            else:
                head_close = '</head>'
                return html.replace(head_close, f"\n    {meta_tag}\n{head_close}")

        # Modify meta tags and title
        modified_html = update_or_add_meta(
            html, r'<meta name="description" content=".*?">',
            f'<meta name="description" content="{product_data["meta_description"]}">',
            f'<meta name="description" content="{product_data["meta_description"]}">' 
        )

        modified_html = update_or_add_meta(
            modified_html, r'<meta name="keywords" content=".*?">',
            f'<meta name="keywords" content="{product_data["meta_keywords"]}">',
            f'<meta name="keywords" content="{product_data["meta_keywords"]}">' 
        )

        modified_html = update_or_add_meta(
            modified_html, r'<meta property="og:title" content=".*?">',
            f'<meta property="og:title" content="{product_data["product_name"]} - Medingen">',
            f'<meta property="og:title" content="{product_data["product_name"]} - Medingen">' 
        )

        modified_html = update_or_add_meta(
            modified_html, r'<meta name="title" content=".*?">',
            f'<meta name="title" content="{product_data["meta_title"]}">',
            f'<meta name="title" content="{product_data["meta_title"]}">' 
        )

        modified_html = update_or_add_meta(
            modified_html, r'<meta property="og:description" content=".*?">',
            f'<meta property="og:description" content="{product_data["meta_description"]}">',
            f'<meta property="og:description" content="{product_data["meta_description"]}">' 
        )

        modified_html = update_or_add_meta(
            modified_html, r'<meta property="og:url" content=".*?">',
            f'<meta property="og:url" content="{product_data["product_url"]}">',
            f'<meta property="og:url" content="{product_data["product_url"]}">' 
        )

        modified_html = update_or_add_meta(
            modified_html, r'<meta property="og:type" content=".*?">',
            '<meta property="og:type" content="product">',
            '<meta property="og:type" content="product">' 
        )

        modified_html = update_or_add_meta(
            modified_html, r'<meta property="og:image" content=".*?">',
            f'<meta property="og:image" content="{product_data["image_url"]}">',
            f'<meta property="og:image" content="{product_data["image_url"]}">' 
        )

        modified_html = update_or_add_meta(
            modified_html, r'<link rel="canonical" href=".*?">',
            f'<link rel="canonical" href="{product_data["product_url"]}">',
            f'<link rel="canonical" href="{product_data["product_url"]}">' 
        )

        # Update the <title> tag
        modified_html = re.sub(
            r'<title>.*?</title>',
            f'<title>{product_data["meta_title"]}</title>',
            modified_html
        )

        # Update product LD schema with: name, image, description, brand, price, currency, availability, URL
        modified_html += f'''
            <script type="application/ld+json">
            {{
                "@context": "https://schema.org",
                "@type": "Product",
                "name": "{product_data["product_name"]}",
                "image": "{product_data["image_url"]}",
                "description": "{product_data["meta_description"]}",
                "brand": {{
                    "@type": "Brand",
                    "name": "Medingen"
                }},
                "offers": {{
                    "@type": "Offer",
                    "priceCurrency": "INR",
                    "price": "{product_data['price']}",
                    "availability": "https://schema.org/InStock",
                    "url": "{product_data["product_url"]}"
                }}
            }}
            </script>
        '''
        

        return Response(modified_html, mimetype='text/html')

    except Exception as e:
        error_message = f"Error fetching content: {str(e)}"
        stack_trace = traceback.format_exc()
        print(f"{error_message}\n{stack_trace}")
        return Response(error_message, status=500)


@app.errorhandler(404)
def resource_not_found(e):
    return make_response(jsonify(error='Not found!'), 404)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port="8000", debug=True)