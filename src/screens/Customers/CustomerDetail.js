import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import DataTable from "react-data-table-component";
import { Modal, Button, Form } from "react-bootstrap";
import Swal from "sweetalert2";
import "./style.css";
import { useLocation, useParams } from "react-router";
import { ListGroup } from "react-bootstrap";

import {
  API_ENDPOINT,
  cart_status_update,
  update_delivery_charge,
  uploadFile
} from "../../components/api";

const RewardsSection = () => {
  const { id } = useParams(); // Get the customerId from the URL
  const location = useLocation(); // Get the location object to access the state

  const [customerId, setCustomerId] = useState(null);
  const [rewardSummary, setRewardSummary] = useState({
    available: 0,
    overall: 0,
    expiring: 0,
  });
  const [rewardTransactions, setRewardTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rewardData, setRewardData] = useState({
    description: "",
    orderid: "",
    customer_id: customerId,
    reward: "",
    amount: "",
    percentage: "",
    expires: "",
    iconType: "primary",
  });

  const getAuthToken = () => Cookies.get("jwt_token");

  const fetchRewardSummary = async () => {
    const token = getAuthToken();
    try {
      const response = await axios.get(
        `${API_ENDPOINT}rewards-summary?customer=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setRewardSummary(response.data);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch reward summary", "error");
    }
  };

  const fetchRewardTransactions = async (page = 1) => {
    const token = getAuthToken();
    try {
      const response = await axios.get(
        `${API_ENDPOINT}rewards?customer=${customerId}&page=${page}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setRewardTransactions(Array.isArray(response.data.transactions) ? response.data.transactions : []);
      setCurrentPage(page);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch reward transactions", "error");
    }
  };

  useEffect(() => {
    // Check if customerId exists in state, otherwise use the one from URL
    if (location.state?.customer_id) {
      setCustomerId(location.state.customer_id); // Use the customerId from state
    } else if (id) {
      setCustomerId(id); // Use the customerId from URL
    }
  }, [id, location.state]); // Re-run when either `id` or `location.state` changes

  useEffect(() => {
    fetchRewardSummary();
    fetchRewardTransactions();
  }, [customerId]);

  const handleChange = (e) =>
    setRewardData({ ...rewardData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = getAuthToken();
    try {
      const response = await axios.post(
        `${API_ENDPOINT}add-reward?customer=${customerId}`,
        rewardData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      Swal.fire("Success", response.data.message, "success");
      setRewardData({
        description: "",
        orderid: "",
        customer_id: customerId,
        reward: "",
        amount: "",
        percentage: "",
        expires: "",
        iconType: "primary",
      });
      fetchRewardTransactions();
      fetchRewardSummary();
    } catch (error) {
      Swal.fire("Error", "Failed to add reward coins", "error");
    }
  };

  const handleDelete = async (id) => {
    const token = getAuthToken();
    try {
      await axios.delete(`${API_ENDPOINT}delete-reward/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      Swal.fire("Success", "Reward deleted successfully!", "success");
      fetchRewardTransactions();
    } catch (error) {
      Swal.fire("Error", "Failed to delete reward", "error");
    }
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-6">
          <h3>Rewards Summary</h3>
          <ul className="list-group">
            <li className="list-group-item">
              Available Coins: {rewardSummary.available}
            </li>
            <li className="list-group-item">
              Redeemed Coins:{" "}
              {parseFloat(rewardSummary.overall) -
                parseFloat(rewardSummary.available)}
            </li>
            <li className="list-group-item">
              Expiring Coins: {rewardSummary.expiring}
            </li>
            <li className="list-group-item">
              Overall Coins Earned: {rewardSummary.overall}
            </li>
          </ul>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-12">
          <h3>Reward Transactions</h3>
          <DataTable
            columns={[
              { name: "Date", selector: (row) => row.date },
              { name: "Description", selector: (row) => row.description },
              { name: "Amount", selector: (row) => row.amount },
              { name: "Expires", selector: (row) => row.expires },
              { name: "Order ID", selector: (row) => row.orderid },
              { name: "Percentage", selector: (row) => row.percentage },
              { name: "Reward", selector: (row) => row.reward },
              {
                name: "Action",
                cell: (row) => (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(row.id)}
                  >
                    Delete
                  </button>
                ),
              },
            ]}
            data={Array.isArray(rewardTransactions) ? rewardTransactions : []}
            pagination
            highlightOnHover
            striped
            onChangePage={(page) => fetchRewardTransactions(page)}
          />
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-6">
          <h3>Add Reward Coins</h3>
          <form onSubmit={handleSubmit} className="p-3 border rounded bg-light">
            <input
              className="form-control mb-2"
              type="text"
              name="description"
              placeholder="Description"
              value={rewardData.description}
              onChange={handleChange}
              required
            />
            <input
              className="form-control mb-2"
              type="text"
              name="orderid"
              placeholder="Order ID"
              value={rewardData.orderid}
              onChange={handleChange}
              required
            />
            <input
              className="form-control mb-2"
              type="number"
              name="reward"
              placeholder="Reward Coins"
              value={rewardData.reward}
              onChange={handleChange}
              required
            />
            <input
              className="form-control mb-2"
              type="number"
              step="0.01"
              name="amount"
              placeholder="Amount"
              value={rewardData.amount}
              onChange={handleChange}
              required
            />
            <input
              className="form-control mb-2"
              type="text"
              name="percentage"
              placeholder="Percentage"
              value={rewardData.percentage}
              onChange={handleChange}
            />
            <input
              className="form-control mb-2"
              type="date"
              name="expires"
              value={rewardData.expires}
              onChange={handleChange}
            />
            <select
              className="form-control mb-2"
              name="iconType"
              value={rewardData.iconType}
              onChange={handleChange}
            >
              <option value="primary">Primary</option>
              <option value="secondary">Secondary</option>
            </select>
            <button className="btn btn-primary w-100" type="submit">
              Add Reward
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const CustomerDetail = () => {
  const { id } = useParams(); // Get the customerId from the URL
  const location = useLocation(); // Get the location object to access the state

  const [customerId, setCustomerId] = useState(null);

  const [customerInfo, setCustomerInfo] = useState({});
  const [addresses, setAddresses] = useState([]);
  const [cartDetails, setCartDetails] = useState({});
  const [prescriptions, setPrescriptions] = useState([]);
  const [rewardSummary, setRewardSummary] = useState({});
  const [rewardTransactions, setRewardTransactions] = useState([]);
  const [requestedProducts, setRequestedProducts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState({});
  const [newCartItem, setNewCartItem] = useState({
    product_id: "",
    quantity: 1,
  });
  const [expandedCartId, setExpandedCartId] = useState(null);

  useEffect(() => {
    // Check if customerId exists in state, otherwise use the one from URL
    if (location.state?.customer_id) {
      setCustomerId(location.state.customer_id); // Use the customerId from state
    } else if (id) {
      setCustomerId(id); // Use the customerId from URL
    }
  }, [id, location.state]); // Re-run when either `id` or `location.state` changes

  useEffect(() => {
    console.log("Customer ID", customerId);
    // load from location.state
    if (customerId === null) {
      // Swal.fire({
      //   title: "Enter Customer ID",
      //   input: "text",
      //   showCancelButton: true,
      //   confirmButtonText: "Fetch Data",
      //   cancelButtonText: "Cancel",
      //   inputValidator: (value) => {
      //     if (!value) {
      //       return "Customer ID is required!";
      //     }
      //   },
      // }).then((result) => {
      //   if (result.isConfirmed) {
      //     const id = result.value;
      //     setCustomerId(id);
      //   }
      // });
    } else {
      fetchData(customerId);
    }
  }, [customerId]);

  const fetchData = (id) => {
    Swal.showLoading();
    fetchCustomerInfo(id);
    fetchAddresses(id);
    fetchCartDetails(id);
    fetchPrescriptions(id);
    fetchRequestedProducts(id);
    // after 2s hide loading
    setTimeout(() => {
      Swal.close();
    }, 1000);
  };

  const getAuthToken = () => {
    return Cookies.get("jwt_token");
  };

  const updateDeliveryAddress = async (addresses, cart_id) => {
    // get the address ID via Swal
    const addressId = await Swal.fire({
      title: "Select Address",
      input: "select",
      inputOptions: {
        ...addresses.reduce((acc, address, index) => {
          acc[
            index
          ] = `#${address.id} - ${address.name} - ${address.address1}, ${address.state}, ${address.pincode}`;
          return acc;
        }, {}),
      },
      inputPlaceholder: "Select an address",
      showCancelButton: true,
      confirmButtonText: "Update",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value) {
          return "You need to choose an address";
        }
      },
    });
    Swal.showLoading();
    const token = Cookies.get("jwt_token");
    try {
      const response = await axios.post(
        `${API_ENDPOINT}update_delivery_address?customer=${customerId}`,
        { address_id: addresses[addressId.value].id, cart_id: cart_id },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 200) {
        Swal.fire({
          title: "Success!",
          text: "Delivery address updated successfully",
          icon: "success",
          confirmButtonText: "Okay",
        }).then(() => {
          // Refresh the prescriptions after updating
          fetchCartDetails(); // Make sure to define this function to fetch updated cart details
        });
      } else {
        Swal.fire({
          title: "Error!",
          text: "Failed to update delivery address " + response.statusText,
          icon: "error",
          confirmButtonText: "Okay",
        });
      }
    } catch (error) {
      console.error("Error updating delivery address:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to update delivery address",
        icon: "error",
        confirmButtonText: "Okay",
      });
    }
  };

  const updateChoosePrescription = async (prescription, cart_id) => {
    // get the prescription ID via Swal
    const prescription_id = await Swal.fire({
      title: "Select Prescription",
      input: "select",
      inputOptions: {
        ...prescription.reduce((acc, presc, index) => {
          acc[index] = `#${presc.prescription_id} - ${presc.prescription_name}`;
          return acc;
        }, {}),
      },
      inputPlaceholder: "Select a prescription",
      showCancelButton: true,
      confirmButtonText: "Update",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value) {
          return "You need to choose a prescription";
        }
      },
    });

    // 🛑 If user cancelled, exit early
  if (!prescription_id.isConfirmed) {
    return;
  }

    console.log(
      "Prescription ID:",
      prescription[prescription_id.value].prescription_id
    );

    Swal.showLoading();
    const token = Cookies.get("jwt_token");
    try {
      const response = await axios.post(
        `${API_ENDPOINT}update_choose_prescription?customer=${customerId}`,
        {
          prescription_id: prescription[prescription_id.value].prescription_id,
          cart_id: cart_id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.status === 200) {
        Swal.fire({
          title: "Success!",
          text: "Prescription updated successfully",
          icon: "success",
          confirmButtonText: "Okay",
        }).then(() => {
          // Refresh the prescriptions after updating
          fetchCartDetails(); // Make sure to define this function to fetch updated cart details
        });
      } else {
        Swal.fire({
          title: "Error!",
          text: "Failed to update prescription " + response.statusText,
          icon: "error",
          confirmButtonText: "Okay",
        });
      }
    } catch (error) {
      console.error("Error updating prescription:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to update prescription",
        icon: "error",
        confirmButtonText: "Okay",
      });
    }
  };

  const fetchCustomerInfo = async () => {
    const token = getAuthToken();
    try {
      const response = await axios.get(
        `${API_ENDPOINT}get_profile?customer=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setCustomerInfo(response.data);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch customer info", "error");
    }
  };

  const fetchAddresses = async () => {
    const token = getAuthToken();
    try {
      const response = await axios.get(
        `${API_ENDPOINT}list_addresses?customer=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setAddresses(Array.isArray(response.data.addresses) ? response.data.addresses : []);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch addresses", "error");
    }
  };

  const fetchCartDetails = async () => {
    const token = getAuthToken();
    try {
      const response = await axios.get(
        `${API_ENDPOINT}cart?customer=${customerId}&all_orders=1`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCartDetails(response.data || []);
    } catch (error) { }
  };

  const fetchPrescriptions = async () => {
    const token = getAuthToken();
    try {
      const response = await axios.get(
        `${API_ENDPOINT}list_prescriptions?customer=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      setPrescriptions(response.data.prescriptions);
    } catch (error) {
      Swal.fire("Error", "Failed to fetch prescriptions", "error");
    }
  };

  const fetchRequestedProducts = async () => {
    const token = getAuthToken();
    try {
      const response = await axios.get(
        `${API_ENDPOINT}product_requests?customer=${customerId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      const productIds = response.data.map((req) => req.product_id).join(",");
      if (!productIds) {
        return;
      }
      const productDetails = await axios.post(
        `${API_ENDPOINT}products`,
        { page: 1, query: `product_id IN (${productIds})`, text: "" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      productDetails.data.results.forEach((product) => {
        const requestedProduct = response.data.find(
          (req) => req.product_id === product.product_id
        );
        product.requested_date = requestedProduct.request_date;
      });
      setRequestedProducts(Array.isArray(productDetails.data.results) ? productDetails.data.results : []);

    } catch (error) {
      Swal.fire("Error", "Failed to fetch requested products", "error");
    }
  };
  const deletePrescriptionAPI = async (prescriptionId) => {
    try {
      const response = await axios.post(
        `${API_ENDPOINT}delete_prescription?customer=${customerId}`,
        { id: prescriptionId },
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: response.data.message,
        });
        // Refresh the prescriptions after deletion
        fetchPrescriptions(); // Make sure to define this function to fetch updated prescriptions
      } else {
        Swal.fire({
          icon: "error",
          title: "Error!",
          text: response.data.message || "Failed to delete the prescription.",
        });
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error!",
        text: "An unexpected error occurred.",
      });
    }
  };
  const handleAddAddress = () => {
    setEditingAddress({}); // Reset editing address for new address
    setIsEditing(false);
    setShowEditAddressModal(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setIsEditing(true);
    setShowEditAddressModal(true);
  };

  const handleDeleteAddress = async (id) => {
    const token = getAuthToken();
    try {
      await axios.delete(
        `${API_ENDPOINT}delete_address?customer=${customerId}&id=${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      fetchAddresses();
      Swal.fire("Success", "Address deleted successfully", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to delete address", "error");
    }
  };

  const handleAddItemToCart = async (productId, quantity) => {
    const token = getAuthToken();
    try {
      await axios.post(
        `${API_ENDPOINT}add-to-cart?customer=${customerId}`,
        { product_id: productId, quantity },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      fetchCartDetails();
      Swal.fire("Success", "Item added to cart", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to add item to cart", "error");
    }
  };

  const handleUpdateCartItems = async (cartId, cartItems) => {
    const token = getAuthToken();

    const quantities =
      cartItems.map((item) => `${item.id}:${item.quantity}`).join(";") + ";";

    try {
      await axios.post(
        `${API_ENDPOINT}cart_update`,
        { quantities, cart_id: cartId },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      fetchCartDetails();
      Swal.fire("Success", "Cart updated successfully", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to update cart", "error");
    }
  };

  const AdminAddReward = () => {
    const [rewardData, setRewardData] = useState({
      description: "",
      orderid: "",
      customer_id: "",
      reward: "",
      amount: "",
      percentage: "",
      expires: "",
      iconType: "primary",
    });

    const handleChange = (e) => {
      setRewardData({ ...rewardData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const response = await fetch("/api/add-reward", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(rewardData),
        });

        const result = await response.json();
        alert(result.message);
      } catch (error) {
        console.error("Error adding reward:", error);
      }
    };

    return (
      <div className="admin-reward-section">
        <h3>Add Reward Coins</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="description"
            placeholder="Description"
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="orderid"
            placeholder="Order ID"
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="customer_id"
            placeholder="Customer ID"
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="reward"
            placeholder="Reward Coins"
            onChange={handleChange}
            required
          />
          <input
            type="number"
            step="0.01"
            name="amount"
            placeholder="Amount"
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="percentage"
            placeholder="Percentage"
            onChange={handleChange}
          />
          <input type="date" name="expires" onChange={handleChange} />
          <select name="iconType" onChange={handleChange}>
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
          </select>
          <button type="submit">Add Reward</button>
        </form>
      </div>
    );
  };

  const renderRewardsSection = () => (
    <div className="col-md-12 mt-4">
      <h3>Rewards Summary</h3>
      <p>Available Coins: {rewardSummary.available}</p>
      <p>
        Redeemed Coins:{" "}
        {parseFloat(rewardSummary.overall) -
          parseFloat(rewardSummary.available)}
      </p>
      <p>Expiring Coins: {rewardSummary.expiring}</p>
      <p>Overall Coins earned: {rewardSummary.overall}</p>

      <AdminAddReward />

      <h3>Reward Transactions</h3>
      <DataTable
        columns={[
          { name: "Date", selector: (row) => row.date },
          { name: "Description", selector: (row) => row.description },
          { name: "Amount", selector: (row) => row.amount },
          { name: "Expires", selector: (row) => row.expires },
          { name: "Order ID", selector: (row) => row.orderid },
          { name: "Percentage", selector: (row) => row.percentage },
          { name: "Reward", selector: (row) => row.reward },
        ]}
        data={Array.isArray(rewardTransactions) ? rewardTransactions : []} // Ensure this data is aligned with the API response
        pagination // Add pagination if needed
        highlightOnHover
        striped
      />
    </div>
  );

  const RenderPrescriptionsSection = () => {
    const [associatedProducts, setAssociatedProducts] = useState({});
    const [selectedPrescriptionId, setSelectedPrescriptionId] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [prescriptionComments, setPrescriptionComments] = useState("");

    const updateAssociationAPI = async (prescriptionId, updatedProducts) => {
      const token = getAuthToken();
      const product_ids = updatedProducts
        .map((product) => product.product_id)
        .join(",");
      try {
        await axios.post(
          `${API_ENDPOINT}update_presc_assoc`,
          { prescription_id: prescriptionId, product_ids: product_ids },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        setAssociatedProducts((prev) => ({
          ...prev,
          [prescriptionId]: updatedProducts,
        }));
        fetchPrescriptions(); // Fetch updated prescriptions
        Swal.fire("Success", "Association updated", "success");
      } catch (error) {
        Swal.fire("Error", "Association failed to update", "error");
      }

      console.log(
        `Updating prescription ${prescriptionId} with products:`,
        updatedProducts
      );
    };

    const updatePrescriptionComments = async (prescriptionId, comments) => {
      const token = getAuthToken();
      try {
        await axios.put(
          `${API_ENDPOINT}update_prescription_comments?customer=${customerId}`,
          { prescription_id: prescriptionId, prescription_comments: comments },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        fetchPrescriptions(); // Fetch updated prescriptions
        Swal.fire("Success", "Prescription comments updated", "success");
      } catch (error) {
        Swal.fire("Error", "Failed to update prescription comments", "error");
      }
    };

    const handleUpdateAssociation = (prescriptionId, updatedProducts) => {
      updateAssociationAPI(prescriptionId, updatedProducts);
    };

    const openAssociateProductsModal = (prescription) => {
      setSelectedPrescriptionId(prescription.prescription_id);
      setPrescriptionComments(prescription.prescription_comments || "");
      setAssociatedProducts((prev) => ({
        ...prev,
        [prescription.prescription_id]: prescription.associated_products || [],
      }));
      setShowModal(true);
    };

    const closeModal = () => {
      setShowModal(false);
    };

    const handleDeleteProduct = (index) => {
      const updatedProducts = associatedProducts[selectedPrescriptionId].filter(
        (_, i) => i !== index
      );
      handleUpdateAssociation(selectedPrescriptionId, updatedProducts);
    };

    const handleAddProduct = () => {
      const newProductId = document.getElementById("newProductId").value.trim();

      if (newProductId) {
        const newProduct = {
          product_id: newProductId,
          product_name: "New product added. Refresh to view name.",
        };
        const updatedProducts = [
          ...(associatedProducts[selectedPrescriptionId] || []),
          newProduct,
        ];
        handleUpdateAssociation(selectedPrescriptionId, updatedProducts);
        document.getElementById("newProductId").value = ""; // Clear input field
      }
    };

    return (
      <div className="col-md-12 mt-4">
        <h3>Prescriptions</h3>
        <div className="prescription-view row">
          {prescriptions.length === 0 && (
            <div className="col-md-12">
              <p>No prescriptions available</p>
            </div>
          )}
          {prescriptions.map((prescription) => (
            <div
              className="col-md-12"
              key={prescription.id}
              style={{ textAlign: "center", marginTop: "30px" }}
            >
              <div className="row">
                <div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                  <img
                    src={`https://mig-store-mhpl.s3.ap-south-1.amazonaws.com/prescription/${prescription.prescription_image_url}`}
                    alt={`Prescription ${prescription.id}`}
                    className="img-thumbnail"
                    style={{ cursor: "pointer", width: "100%" }}
                    onClick={() => {
                      window.open(
                        `https://mig-store-mhpl.s3.ap-south-1.amazonaws.com/prescription/${prescription.prescription_image_url}`,
                        "_blank"
                      );
                    }}
                  />
                </div>
                <div className="col-lg-6 col-md-6 col-sm-12 col-xs-12">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Date</th>
                        <th>Name</th>
                        <th>Status</th>
                        <th>Comments</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>{prescription.prescription_id}</td>
                        <td>{prescription.prescription_date}</td>
                        <td>{prescription.prescription_name}</td>
                        <td>{prescription.prescription_status}</td>
                        <td>{prescription.prescription_comments}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ marginBottom: "15px" }}>
                    <textarea
                      className="form-control"
                      value={prescriptionComments}
                      onChange={(e) => setPrescriptionComments(e.target.value)}
                      placeholder="Update comments"
                    ></textarea>
                    <button
                      className="btn btn-primary mt-2"
                      onClick={() =>
                        updatePrescriptionComments(
                          prescription.prescription_id,
                          prescriptionComments
                        )
                      }
                    >
                      Update Comments
                    </button>
                  </div>

                  <button
                    className="btn btn-danger mt-2"
                    onClick={() =>
                      deletePrescriptionAPI(prescription.prescription_id)
                    }
                  >
                    Delete
                  </button>
                  <br />
                  <br />
                  <button
                    className="btn btn-secondary mt-2"
                    onClick={() => openAssociateProductsModal(prescription)}
                  >
                    Associate Products
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal for associating products */}
        <Modal show={showModal} onHide={closeModal} centered>
          <Modal.Header closeButton>
            <Modal.Title>Manage Products for Prescription</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {associatedProducts[selectedPrescriptionId] && (
              <div>
                {associatedProducts[selectedPrescriptionId].map(
                  (product, index) => (
                    <div
                      key={product.product_id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "10px",
                      }}
                    >
                      <span>
                        {product.product_name} (ID: {product.product_id})
                      </span>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDeleteProduct(index)}
                      >
                        &times;
                      </button>
                    </div>
                  )
                )}

                {/* Input fields to add new product */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <input
                    type="text"
                    id="newProductId"
                    placeholder="Product ID"
                    className="form-control"
                    style={{ marginRight: "10px" }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleAddProduct}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeModal}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    );
  };

  const RemindersSection = () => {
    const [reminders, setReminders] = useState([]);
    const [expandedReminderId, setExpandedReminderId] = useState(null);
    const [newReminder, setNewReminder] = useState({
      start_date: "",
      end_date: "",
      time: "",
      products: "",
    });

    const fetchReminders = async () => {
      const token = getAuthToken();
      try {
        const response = await axios.get(
          `${API_ENDPOINT}all_reminders?customer=${customerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setReminders(response.data);
      } catch (error) {
        Swal.fire("Error", "Failed to fetch reminders", "error");
      }
    };

    const deleteReminderAPI = async (reminderId) => {
      const token = getAuthToken();
      try {
        await axios.post(
          `${API_ENDPOINT}delete_reminder?customer=${customerId}`,
          { reminder_id: reminderId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        Swal.fire("Success", "Reminder deleted successfully", "success");
        fetchReminders();
      } catch (error) {
        Swal.fire("Error", "Failed to delete reminder", "error");
      }
    };

    const addReminderAPI = async () => {
      const token = getAuthToken();
      const localDate = new Date(newReminder.time);
      const utcDate = new Date(
        localDate.getTime() + localDate.getTimezoneOffset() * 60000
      );


      const adjustedReminder = {
        ...newReminder,
        time: utcDate.toISOString(), // Ensures proper UTC ISO conversion
      };

      try {
        await axios.post(
          `${API_ENDPOINT}add_reminder?customer=${customerId}`,
          adjustedReminder,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        Swal.fire("Success", "Reminder added successfully", "success");
        fetchReminders();
        setNewReminder({
          start_date: "",
          end_date: "",
          time: "",
          products: "",
        });
      } catch (error) {
        Swal.fire("Error", "Failed to add reminder", "error");
      }
    };

    const toggleReminderExpansion = (reminderId) => {
      setExpandedReminderId(
        expandedReminderId === reminderId ? null : reminderId
      );
    };

    useEffect(() => {
      fetchReminders();
    }, []);

    return (
      <div className="col-md-12 mt-4">
        <h3>Reminders</h3>
        <div className="mb-4">
          <h5>Add Reminder</h5>
          <div className="row">
            <div className="col-md-3">
              <input
                type="date"
                className="form-control"
                placeholder="Start Date"
                value={
                  newReminder.start_date
                    ? new Date(newReminder.start_date)
                      .toISOString()
                      .split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  const isoDate = selectedDate.toISOString(); // Convert to full ISO 8601 format
                  setNewReminder({ ...newReminder, start_date: isoDate });
                }}
              />
            </div>

            <div className="col-md-3">
              <input
                type="date"
                className="form-control"
                placeholder="End Date"
                value={
                  newReminder.end_date
                    ? new Date(newReminder.end_date).toISOString().split("T")[0]
                    : ""
                }
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  const isoDate = selectedDate.toISOString(); // Convert to full ISO 8601 format
                  setNewReminder({ ...newReminder, end_date: isoDate });
                }}
              />
            </div>

            <div className="col-md-3">
              <input
                type="time"
                className="form-control"
                placeholder="Time"
                value={
                  newReminder.time
                    ? new Date(newReminder.time).toISOString().slice(11, 16)
                    : ""
                }
                onChange={(e) => {
                  const selectedTime = e.target.value; // Get selected HH:MM
                  const currentDate = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD
                  const isoDateTime = `${currentDate}T${selectedTime}:00.000Z`; // Format to ISO

                  setNewReminder({ ...newReminder, time: isoDateTime });
                }}
              />
            </div>
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Products (comma-separated IDs)"
                value={newReminder.products}
                onChange={(e) =>
                  setNewReminder({ ...newReminder, products: e.target.value })
                }
              />
            </div>
            <div className="col-md-12 mt-2">
              <button className="btn btn-primary" onClick={addReminderAPI}>
                Add Reminder
              </button>
            </div>
          </div>
        </div>

        <ListGroup>
          {reminders.map((reminder) => (
            <ListGroup.Item key={reminder.id}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Reminder ID:</strong> {reminder.id} <br />
                  <strong>Start Date:</strong> {reminder.start_date} <br />
                  <strong>End Date:</strong> {reminder.end_date} <br />
                  <strong>Time:</strong> {reminder.reminder_time} <br />
                </div>
                <div>
                  <Button
                    variant="primary"
                    onClick={() => toggleReminderExpansion(reminder.id)}
                  >
                    {expandedReminderId === reminder.id ? "Collapse" : "Expand"}
                  </Button>
                  <Button
                    variant="danger"
                    className="ms-2"
                    onClick={() => deleteReminderAPI(reminder.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {expandedReminderId === reminder.id && (
                <div className="mt-3">
                  <h5>Taken History</h5>
                  <ListGroup>
                    {generateDateRange(
                      reminder.start_date,
                      reminder.end_date
                    ).map((date) => (
                      <ListGroup.Item
                        key={date}
                        className="d-flex justify-content-between align-items-center"
                      >
                        {date}
                        {reminder.taken_history
                          .map((datetime) => datetime.split(" ")[0])
                          .includes(date) ? (
                          <span className="text-success">&#10003;</span>
                        ) : (
                          <span className="text-danger">&#10007;</span>
                        )}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </div>
              )}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>
    );
  };

  const generateDateRange = (start, end) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const dateArray = [];
    while (startDate <= endDate) {
      dateArray.push(startDate.toISOString().split("T")[0]);
      startDate.setDate(startDate.getDate() + 1);
    }
    return dateArray;
  };

  const PatientRecords = () => {
    const [patientRecords, setPatientRecords] = useState([]);
    const [newRecord, setNewRecord] = useState({
      name: "",
      age: "",
      gender: "",
      contact_info: "",
      medical_history: "",
    });
    const [editingRecordId, setEditingRecordId] = useState(null);
    const [searchFilter, setSearchFilter] = useState("");

    const fetchPatientRecords = async () => {
      const token = getAuthToken();
      try {
        const response = await axios.get(
          `${API_ENDPOINT}patient_records?customer=${customerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setPatientRecords(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        Swal.fire("Error", "Failed to fetch patient records", "error");
      }
    };

    const addPatientRecordAPI = async () => {
      const token = getAuthToken();
      try {
        await axios.post(
          `${API_ENDPOINT}add_patient_record?customer=${customerId}`,
          newRecord,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        Swal.fire("Success", "Patient record added successfully", "success");
        fetchPatientRecords();
        setNewRecord({
          name: "",
          age: "",
          gender: "",
          contact_info: "",
          medical_history: "",
        });
      } catch (error) {
        Swal.fire("Error", "Failed to add patient record", "error");
      }
    };

    const updatePatientRecordAPI = async (recordId) => {
      const token = getAuthToken();
      try {
        await axios.put(
          `${API_ENDPOINT}update_patient_record/${recordId}?customer=${customerId}`,
          newRecord,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        Swal.fire("Success", "Patient record updated successfully", "success");
        fetchPatientRecords();
        setEditingRecordId(null);
      } catch (error) {
        Swal.fire("Error", "Failed to update patient record", "error");
      }
    };

    const deletePatientRecordAPI = async (recordId) => {
      const token = getAuthToken();
      try {
        await axios.delete(
          `${API_ENDPOINT}delete_patient_record/${recordId}?customer=${customerId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        Swal.fire("Success", "Patient record deleted successfully", "success");
        fetchPatientRecords();
      } catch (error) {
        Swal.fire("Error", "Failed to delete patient record", "error");
      }
    };

    const handleSave = () => {
      if (editingRecordId) {
        updatePatientRecordAPI(editingRecordId);
      } else {
        addPatientRecordAPI();
      }
    };

    const columns = [
      { name: "Name", selector: (row) => row.name, sortable: true },
      { name: "Age", selector: (row) => row.age, sortable: true },
      { name: "Gender", selector: (row) => row.gender, sortable: true },
      { name: "Contact Info", selector: (row) => row.contact_info },
      { name: "Medical History", selector: (row) => row.medical_history },
      {
        name: "Actions",
        cell: (row) => (
          <>
            <button
              className="btn btn-sm btn-primary me-2"
              onClick={() => {
                setEditingRecordId(row.id);
                setNewRecord({
                  name: row.name,
                  age: row.age,
                  gender: row.gender,
                  contact_info: row.contact_info,
                  medical_history: row.medical_history,
                });
              }}
            >
              Edit
            </button>
            <button
              className="btn btn-sm btn-danger"
              onClick={() =>
                Swal.fire({
                  title: "Are you sure?",
                  text: "This action cannot be undone.",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "Yes, delete it!",
                }).then((result) => {
                  if (result.isConfirmed) {
                    deletePatientRecordAPI(row.id);
                  }
                })
              }
            >
              Delete
            </button>
          </>
        ),
      },
    ];

    useEffect(() => {
      fetchPatientRecords();
    }, []);



    return (
      <div className="col-md-12 mt-4">
        <h3>Patient Records</h3>
        <div className="mb-4">
          <h5>
            {editingRecordId ? "Edit Patient Record" : "Add Patient Record"}
          </h5>
          <div className="row">
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Name"
                value={newRecord.name}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, name: e.target.value })
                }
              />
            </div>
            <div className="col-md-2">
              <input
                type="number"
                className="form-control"
                placeholder="Age"
                value={newRecord.age}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, age: e.target.value })
                }
              />
            </div>
            <div className="col-md-2">
              <select
                className="form-control"
                value={newRecord.gender}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, gender: e.target.value })
                }
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="col-md-2">
              <input
                type="text"
                className="form-control"
                placeholder="Contact Info"
                value={newRecord.contact_info}
                onChange={(e) =>
                  setNewRecord({ ...newRecord, contact_info: e.target.value })
                }
              />
            </div>
            <div className="col-md-3">
              <input
                type="text"
                className="form-control"
                placeholder="Medical History"
                value={newRecord.medical_history}
                onChange={(e) =>
                  setNewRecord({
                    ...newRecord,
                    medical_history: e.target.value,
                  })
                }
              />
            </div>
            <div className="col-md-12 mt-2">
              <button className="btn btn-primary" onClick={handleSave}>
                {editingRecordId ? "Update Record" : "Add Record"}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search records"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={
            Array.isArray(patientRecords)
              ? patientRecords.filter((record) =>
                (record.name || "").toLowerCase().includes((searchFilter || "").toLowerCase())
              )
              : []
          }
          pagination
          highlightOnHover
          pointerOnHover
        />
      </div>
    );
  };

  const Notifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [newNotification, setNewNotification] = useState({
      receiver: customerId,
      message: "",
      date_received: "",
    });
    const [searchFilter, setSearchFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchNotifications = async () => {
      const token = getAuthToken();
      try {
        const response = await axios.get(
          `${API_ENDPOINT}notifications?customer=${customerId}&all_notifications=1`,
          {
            params: {
              page: currentPage,
            },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setNotifications(response.data.notifications || []);
        setTotalPages(response.data.total_pages);
      } catch (error) {
        Swal.fire("Error", "Failed to fetch notifications", "error");
      }
    };

    // Function to handle showing the SweetAlert
    const handleCellClick = (title, content) => {
      Swal.fire({
        title: title,
        text: content,
        icon: "info",
      });
    };

    const createNotificationAPI = async () => {
      const token = getAuthToken();
      try {
        await axios.post(
          `${API_ENDPOINT}create_notification`,
          { ...newNotification, receiver: customerId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        Swal.fire("Success", "Notification created successfully", "success");
        fetchNotifications();
        setNewNotification({
          receiver: customerId,
          message: "",
          date_received: "",
        });
      } catch (error) {
        Swal.fire("Error", "Failed to create notification", "error");
      }
    };

    const deleteNotificationAPI = async (notificationId) => {
      const token = getAuthToken();
      try {
        await axios.delete(
          `${API_ENDPOINT}delete_notification/${notificationId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        Swal.fire("Success", "Notification deleted successfully", "success");
        fetchNotifications();
      } catch (error) {
        Swal.fire("Error", "Failed to delete notification", "error");
      }
    };

    const columns = [
      {
        name: "Sender",
        selector: (row) => row.sender,
        sortable: true,
        cell: (row) => (
          <div
            style={{
              maxWidth: "200px",
              wordWrap: "break-word",
              cursor: "pointer",
            }}
            onClick={() => handleCellClick("Sender", row.sender)}
          >
            {row.sender}
          </div>
        ),
      },
      {
        name: "Receiver",
        selector: (row) => row.receiver,
        sortable: true,
        cell: (row) => (
          <div
            style={{
              maxWidth: "200px",
              wordWrap: "break-word",
              cursor: "pointer",
            }}
            onClick={() => handleCellClick("Receiver", row.receiver)}
          >
            {row.receiver}
          </div>
        ),
      },
      {
        name: "Message",
        selector: (row) => row.message,
        cell: (row) => (
          <div
            style={{
              maxWidth: "200px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
            onClick={() => handleCellClick("Message", row.message)}
          >
            <div dangerouslySetInnerHTML={{ __html: row.message }} />
          </div>
        ),
      },
      {
        name: "Date Received",
        selector: (row) => row.date_received,
        sortable: true,
        cell: (row) => (
          <div
            style={{
              maxWidth: "150px",
              wordWrap: "break-word",
              cursor: "pointer",
            }}
            onClick={() => handleCellClick("Date Received", row.date_received)}
          >
            {row.date_received}
          </div>
        ),
      },
      {
        name: "Read Status",
        selector: (row) => (row.read_status ? row.read_status : "Not Read"),
        sortable: true,
        cell: (row) => (
          <div
            style={{
              maxWidth: "150px",
              wordWrap: "break-word",
              cursor: "pointer",
            }}
            onClick={() =>
              handleCellClick(
                "Read Status",
                row.read_status ? row.read_status : "Not Read"
              )
            }
          >
            {row.read_status ? row.read_status : "Not Read"}
          </div>
        ),
      },
      {
        name: "Actions",
        cell: (row) => (
          <button
            className="btn btn-sm btn-danger"
            onClick={() =>
              Swal.fire({
                title: "Are you sure?",
                text: "This action cannot be undone.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete it!",
              }).then((result) => {
                if (result.isConfirmed) {
                  deleteNotificationAPI(row.id);
                }
              })
            }
          >
            Delete
          </button>
        ),
      },
    ];

    useEffect(() => {
      fetchNotifications();
    }, [currentPage]);

    const handlePageChange = (page) => {
      setCurrentPage(page);
    };

    return (
      <div className="col-md-12 mt-4">
        <h3>Notifications</h3>
        <div className="mb-4">
          <h5>Create Notification</h5>
          <div className="row">
            <div className="col-md-8">
              <textarea
                className="form-control"
                placeholder="Message"
                value={newNotification.message}
                onChange={(e) =>
                  setNewNotification({
                    ...newNotification,
                    message: e.target.value,
                  })
                }
              />
            </div>
            <div className="col-md-2">
              <input
                type="datetime-local"
                className="form-control"
                value={
                  newNotification.date_received
                    ? newNotification.date_received.slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setNewNotification({
                    ...newNotification,
                    date_received: new Date(e.target.value).toISOString(),
                  })
                }
              />
            </div>
            <div className="col-md-2 mt-2">
              <button
                className="btn btn-primary"
                onClick={createNotificationAPI}
              >
                Send Notification
              </button>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search notifications"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
          />
        </div>

        <DataTable
          columns={columns}
          data={
            Array.isArray(notifications)
              ? notifications.filter((notification) =>
                (notification.message || "")
                  .toLowerCase()
                  .includes((searchFilter || "").toLowerCase())
              )
              : []
          }
          pagination
          paginationServer
          paginationTotalRows={totalPages * 5}
          onChangePage={handlePageChange}
          highlightOnHover
          pointerOnHover
        />
      </div>
    );
  };

  const renderRequestedProductsSection = () => (
    <div className="col-md-12 mt-4">
      <h3>Requested Products</h3>
      <DataTable
        columns={[
          { name: "Product ID", selector: (row) => row.product_id },
          { name: "Requested Date", selector: (row) => row.requested_date },
          { name: "Product Name", selector: (row) => row.product_name },
          { name: "Composition", selector: (row) => row.composition },
          { name: "Salt name", selector: (row) => row.salt_name },
          {
            name: "Price (New)",
            selector: (row) => `₹${row.product_pricing_new}`,
          }, // Adding currency format
          {
            name: "Available",
            selector: (row) =>
              row.product_available !== null
                ? row.product_available
                : "Out of Stock",
          }, // Handle null availability
        ]}
        data={Array.isArray(requestedProducts) ? requestedProducts : []} // Make sure this state contains the updated product data
        pagination // Optional: Add pagination if needed
        highlightOnHover
        striped
      />
    </div>
  );

  // Function to handle profile update
  const updateField = async (field, currentValue) => {
    const { value: newValue } = await Swal.fire({
      title: `Edit ${field}`,
      input: "text",
      inputValue: currentValue,
      showCancelButton: true,
      confirmButtonText: "Save",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value) {
          return "You need to write something!";
        }
      },
    });

    if (newValue) {
      try {
        Swal.showLoading();
        const token = getAuthToken();
        const response = await axios.post(API_ENDPOINT + "update_profile?customer=" + customerId, {
          [field]: newValue,
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 200) {
          setCustomerInfo((prevState) => ({
            ...prevState,
            [field]: newValue,
          }));
          Swal.fire("Success!", `Profile updated successfully!`, "success");
        }
      } catch (error) {
        Swal.fire(
          "Error!",
          "There was an issue updating the profile.",
          "error"
        );
      }
    }
  };

  return (
    <div className="container">
      <h3>Customer Details</h3>
      <div className="row">
        <div className="col-md-6">
          {customerInfo.profilePicture != "default" ? (
            <img
              src={"https://d26lh6sqkii1nb.cloudfront.net/profilepic/" + customerInfo.profilePicture}
              alt={customerInfo.name}
              className="img-thumbnail"
              style={{ width: "100px" }}
            />
          ) : (
            "No profile picture available"
          )}
          <br />
          <br />
          <table className="table table-bordered table-striped">
            <tbody>
              <tr>
                <td>
                  <b>Customer ID:</b>
                </td>
                <td>{customerId}</td>
              </tr>
              <tr>
                <td>
                  <b>Name:</b>
                </td>
                <td>
                  {customerInfo.name}
                  <div
                    className="icofont-edit"
                    onClick={() => updateField("customer_name", customerInfo.name)}
                  >

                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <b>Email:</b>
                </td>
                <td>
                  {customerInfo.email}
                  <div
                    className="icofont-edit"
                    onClick={() => updateField("email", customerInfo.email)}
                  >

                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <b>Phone:</b>
                </td>
                <td>
                  {customerInfo.phone}
                  <div
                    className="icofont-edit"
                    onClick={() => updateField("phonenumber", customerInfo.phone)}
                  >

                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <b>Total MIG coins available:</b>
                </td>
                <td>{customerInfo.coins}</td>
              </tr>
              <tr>
                <td>
                  <b>Date of birth:</b>
                </td>
                <td>
                  {customerInfo.dob}
                  <div
                    className="icofont-edit" onClick={() => updateField("dob", customerInfo.dob)}>

                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="col-md-12">
          <h3>Addresses</h3>
          <DataTable
            columns={[
              {
                name: "Actions",
                cell: (row) => (
                  <div>
                    <Button
                      variant="info"
                      onClick={() => handleEditAddress(row)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleDeleteAddress(row.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ),
              },
              { name: "Address ID", selector: (row) => row.id },
              { name: "Name", selector: (row) => row.name },
              { name: "Phone number", selector: (row) => row.phone_number },
              { name: "Address Line 1", selector: (row) => row.address1 },
              { name: "Pincode", selector: (row) => row.pincode },
              { name: "State", selector: (row) => row.state },
              { name: "Type", selector: (row) => row.type },
              {
                name: "Is Default?",
                selector: (row) => (row.default ? "Yes" : "No"),
              },
            ]}
            data={Array.isArray(addresses) ? addresses : []}
          />{" "}
          <br />
          <div>
            {/* Button to add new address */}
            <Button onClick={handleAddAddress}>Add Address</Button>

            {/* Modal for editing or adding address */}
            <AddressModal
              showModal={showEditAddressModal}
              handleClose={() => setShowEditAddressModal(false)}
              editingAddress={editingAddress}
              setEditingAddress={setEditingAddress}
              isEditing={isEditing}
              fetchAddresses={fetchAddresses} // Assume fetchAddresses is defined
              customerId={customerId} // Assume customerId is defined
            />
          </div>
        </div>
      </div>

      <CartTable
        cartData={cartDetails}
        handleUpdateCartAPI={handleUpdateCartItems}
        handleAddItemToCart={handleAddItemToCart}
        updateChoosePrescription={updateChoosePrescription}
        updateDeliveryAddress={updateDeliveryAddress}
        addresses={addresses}
        prescriptions={prescriptions}
        customer_id={customerId}
        fetchPrescriptions={fetchPrescriptions}
      />

      <RewardsSection />

      {RenderPrescriptionsSection()}
      {renderRequestedProductsSection()}
      {RemindersSection()}
      {PatientRecords()}
      {Notifications()}
    </div>
  );
};

export default CustomerDetail;


export const CartTable = ({
  cartData,
  handleUpdateCartAPI,
  handleAddItemToCart,
  updateChoosePrescription,
  uploadNewPrescription,
  updateDeliveryAddress,
  addresses,
  prescriptions,
  customer_id,
  fetchPrescriptions
}) => {
  const [expandedCartId, setExpandedCartId] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isUpdateEnabled, setIsUpdateEnabled] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const shippingChargeRef = useRef();
  const fileInputRef = useRef(null);
  const [selectedCart, setSelectedCart] = useState(null);

const handleProductClick = (item) => {
  setSelectedCart({...item});
};

useEffect(() => {
  if (selectedCart?.cartStatus) {
    setSelectedStatus(selectedCart.cartStatus.toLowerCase());
  } else {
    setSelectedStatus(""); // fallback
  }
}, [selectedCart]);


  const handleUploadClick = () => {
    fileInputRef.current.click();
  };
    // console.log("Customer ID1", customerId);
    // console.log("Customer ID", customerId);

const handleFileChange = async (event) => {

  const file = event.target.files[0];
  if (!file) return;

  try {
    const prefix = "prescription";

    const uploadedFileName = await uploadFile(file, prefix,customer_id);

    if (!uploadedFileName) {
      throw new Error("Upload failed");
    }
    if (uploadedFileName){
      alert("File uploaded successfully: " + uploadedFileName);
      await fetchPrescriptions();
    }
  } catch (error) {
    console.error("Upload error:", error);
    alert("File upload failed.");
  }

  // Reset file input
  event.target.value = "";
};


  // Update cart items once cartData is available
  useEffect(() => {
    // get the cart object from the list cartData
    if (!expandedCartId) {
      return;
    }
    const cartDataSelected = cartData.find(

      (cart) => cart.cart_id === expandedCartId
    );
    if (cartDataSelected) {
      setCartItems(cartDataSelected.cart);
    }
  }, [expandedCartId]);

  // const handleExpandToggleRow = (toggle, row) => {
  //   if (toggle) {
  //     setExpandedCartId(row.cart_id);
  //   }
  // };

  // const handleExpandRow = (row) => {
  //   setExpandedCartId(row.cart_id);
  // };


  const handleCartRowClick = (row) => {
  setSelectedCart({ ...row }); // ensure selectedCart is set
  handleExpandRow(row); // if you have separate logic
};

  const handleExpandRow = (row) => {
  setSelectedCart({ ...row }); // Set selected cart on row click
  // Existing logic to expand/collapse row
  if (expandedCartId === row.cart_id) {
    setExpandedCartId(null); // collapse
  } else {
    setExpandedCartId(row.cart_id); // expand
  }
};


  const handleAddItem = (type) => {
  Swal.fire({
    title: type === "cart" ? "Add New Cart" : "Add Item to Cart",
    html:
      '<input id="productId" class="swal2-input" placeholder="Product ID">' +
      '<input id="quantity" class="swal2-input" placeholder="Quantity">',
    focusConfirm: false,
    preConfirm: () => {
      const productId = document.getElementById("productId").value;
      const quantity = document.getElementById("quantity").value;

      if (productId && quantity) {
        handleAddItemToCart(productId, quantity);
      } 
    },
  });
};


  const handleUpdateQuantity = (id, newQuantity) => {
    const updatedItems = cartItems.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(newQuantity, 0) } : item
    );
    setCartItems(updatedItems);
    setIsUpdateEnabled(true);
  };

  const handleUpdateItems = () => {
    if (expandedCartId) {
      handleUpdateCartAPI(expandedCartId, cartItems); // Pass cartId and cartItems
      setIsUpdateEnabled(false);
    } else {
      console.error("Cart ID not available");
    }
  };

  const handleStatusUpdate = async (cartId) => {
    if (selectedStatus) {
      Swal.showLoading();
      await cart_status_update(cartId, selectedStatus);
      Swal.fire("Success", "Cart status updated successfully", "success");
    } else {
      Swal.fire("Error", "Please select a status", "error");
    }
  };
  const handleUpdateShipping = async (cartId, inputRef) => {
    const charge = parseFloat(inputRef.current.value);
    if (charge > 0) {
      Swal.showLoading();
      await update_delivery_charge(cartId, charge);
      Swal.fire("Success", "Shipping charges updated successfully", "success");
    } else {
      Swal.fire("Error", "Shipping charge must be greater than 0", "error");
    }
  };


  const handleExpandToggleRow = (expanded, row) => {
  setExpandedCartId(expanded ? row.cart_id : null);

  if (expanded) {
    setSelectedCart({ ...row }); // Set the selected cart
  }
};


  return (
    <div className="cart-table-container">
      <h3 className="cart-title">Orders and Cart Details</h3>
      <Button className="action-button" onClick={() => handleAddItem("cart")}>
        Add Cart
      </Button>
      <DataTable
        className="cart-table"
        columns={[
          { name: "Cart ID", selector: (row) => row.cart_id || "N/A" },
          {
            name: "Total Items",
            selector: (row) => row.orderSummary?.itemsCount || 0,
          },
          {
            name: "Total Price",
            selector: (row) => row.orderSummary?.totalAmount || "N/A",
          },
          {
            name: "Total MRP",
            selector: (row) => row.orderSummary?.totalMRP || "N/A",
          },
          {
            name: "Total Savings",
            selector: (row) => row.orderSummary?.totalSavings || "N/A",
          },
          { name: "Cart Status", selector: (row) => row.cartStatus || "N/A" },
          {
            name: "Last update date",
            selector: (row) => row.cart_updated_date || "N/A",
          },
          {
            name: "Creation date",
            selector: (row) => row.cart_created_date || "N/A",
          },
          {
            name: "Actions",
            cell: (row) => (
              <Button className="action-button" onClick={() => handleAddItem("item")}>
                Add Items
              </Button>
            ),
          },
        ]}
        data={Array.isArray(cartData) ? cartData : []}

        expandableRows
        expandOnRowClicked
        onRowClicked={handleCartRowClick}
        onRowExpandToggled={handleExpandToggleRow}
        expandableRowExpanded={(row) => expandedCartId === row.cart_id}
        expandableRowsComponent={({ data }) => {
          const isUpdatable =
            data.cartStatus === "active" ||
            data.cartStatus === "confirm" ||
            data.cartStatus === "pending_confirm";

          return (
            <div className="expandable-content">
              <h4 className="section-title">Cart Items</h4>
              <div className="cart-items">
                {cartItems.map((item) => (
                  <div key={item.id} className="cart-item">
                    <a href={"/admin/product-edit/" + item.id} target="_blank">
                      <img
                        src={
                          "https://d26lh6sqkii1nb.cloudfront.net/products/" +
                          item.image
                        }
                        alt={item.name}
                        className="item-image"
                      />
                    </a>
                    <div className="item-details">
                      <a href={"/admin/product-edit/" + item.id} target="_blank">

                        <div className="item-name">{item.name}</div>
                      </a>
                      <div className="item-price">{item.discountedPrice}</div>

                      <div className="item-quantity-controls">
                        <Button
                          disabled={!isUpdatable}
                          className="quantity-button"
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          -
                        </Button>
                        <span className="item-quantity">{item.quantity}</span>
                        <Button
                          disabled={!isUpdatable}
                          className="quantity-button"
                          onClick={() =>
                            handleUpdateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {isUpdatable && (
                  <Button
                    className="update-button"
                    onClick={handleUpdateItems}
                    disabled={!isUpdateEnabled}
                  >
                    Update Items
                  </Button>
                )}
              </div>
              <br />
              <br />
              <h4 className="section-title">Prescription Details</h4>
              <div className="prescription-details">
                <table className="cart-table-container prescription-details-table">
                  <tbody>
                    <tr>
                      <td colSpan="2" className="prescription-image-cell">
                        <img
                          src={
                            "https://mig-store-mhpl.s3.ap-south-1.amazonaws.com/prescription/" +
                            (data.prescriptionDetails?.prescription_image_url || "")
                          }
                          alt="Prescription"
                          className="prescription-image"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Name:</b>
                      </td>
                      <td>
                        {data.prescriptionDetails?.prescription_name || "N/A"}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <b>Uploaded on:</b>
                      </td>
                      <td>
                        {data.prescriptionDetails?.prescription_date || "N/A"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <br />
              {isUpdatable && (
                <>
                  <a
                    href="javascript:;"
                    onClick={() =>
                      updateChoosePrescription(prescriptions, data.cart_id)
                    }
                  >
                    Change Prescription
                  </a>
                  <span style={{ margin: "0 10px" }}>|</span>
                  <a href="javascript:;" onClick={handleUploadClick}>
                    Upload New Prescription
                  </a>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg, image/jpg, image/png, image/webp"
                    style={{ display: "none" }}
                  />
                </>
              )}
              <br />
              <br />
              <h4 className="section-title">Delivery Address</h4>
              <div className="delivery-address">
                <table className="delivery-address-table">
                  <tbody>
                    <tr>
                      <td>
                        <b>Name:</b>
                      </td>
                      <td>{data.deliveryAddress?.name || "N/A"}</td>
                    </tr>
                    <tr>
                      <td>
                        <b>Address:</b>
                      </td>
                      <td>{data.deliveryAddress?.addressLine1 || "N/A"}</td>
                    </tr>
                    <tr>
                      <td>
                        <b>State:</b>
                      </td>
                      <td>{data.deliveryAddress?.state || "N/A"}</td>
                    </tr>
                    <tr>
                      <td>
                        <b>Pincode:</b>
                      </td>
                      <td>{data.deliveryAddress?.pincode || "N/A"}</td>
                    </tr>
                    <tr>
                      <td>
                        <b>Phone number:</b>
                      </td>
                      <td>{data.deliveryAddress?.phone_number || "N/A"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <br />
              {isUpdatable && (
                <a
                  href="javascript:;"
                  onClick={() => updateDeliveryAddress(addresses, data.cart_id)}
                >
                  Update Delivery Address
                </a>
              )}
              <br />
              <br />
              <h4 className="section-title">Update Cart Status</h4>
              <div className="cart-status-update">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="status-dropdown"
                >
                  <option value="">Select Status</option>
                  <option value="active">Active</option>
                  <option value="pending_confirm">Pending Confirm</option>
                  <option value="confirm">Confirm</option>
                  <option value="payment">Payment</option>
                  <option value="dispatched">Dispatched</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {/* <Button
                  className="update-status-button"
                  onClick={() => handleStatusUpdate(data.cart_id)}
                >
                  Update Status
                </Button> */}
                <Button
                  className="update-status-button"
                  onClick={() => handleStatusUpdate(selectedCart.cart_id)}
                  disabled={!selectedCart}
                >
                  Update Status
                </Button>
              </div>
              <br />
              <br />
              <h4 className="section-title">Shipping Charge</h4>
              <div className="shipping-charge-update">
                <input
                  disabled={!isUpdatable}
                  ref={shippingChargeRef}
                  type="number"
                  className="shipping-charge-input"
                  defaultValue={data.orderSummary?.total_shipping_charge || 0}
                />
                {isUpdatable && (
                  <Button
                    className="update-shipping-button"
                    onClick={() =>
                      handleUpdateShipping(data.cart_id, shippingChargeRef)
                    }
                  >
                    Update Shipping Charge
                  </Button>
                )}
              </div>
              <br />
              <h4 className="section-title">Order tracking</h4>
              Tracking ID: {data?.order_tracking_id || "N/A"}
              <br /><br />
              <h4 className="section-title">Payment details</h4>
              Payment ID: {data?.payment_id || "N/A"}<br />
              Coupon savings: {data?.coupon_savings || "N/A"}<br />
              {/* Coupon code:  ({data?.coupon_applied || "N/A"}) */}
              <br />
            </div>
          );
        }}
      />
    </div>
  );
};


export const AddressModal = ({
  showModal,
  handleClose,
  editingAddress,
  setEditingAddress,
  isEditing,
  fetchAddresses,
  customerId,
}) => {
  // Helper to get JWT token from cookies
  const getAuthToken = () => Cookies.get("jwt_token");

  // Save handler for add/update address
  const handleAddOrUpdateAddress = async (e) => {
    e.preventDefault(); // Prevent form default submission
    const token = getAuthToken();
    let endpoint, payload;

    // Build address payload with all required fields
    const addressPayload = {
      address1: editingAddress.address1 || "",
      name: editingAddress.name || "",
      pincode: editingAddress.pincode || "",
      state: editingAddress.state || "",
      type: editingAddress.type || "",
      phone_number: editingAddress.phone_number || ""
    };

    if (isEditing) {
      // Endpoint and payload for updating address (assuming your backend expects this)
      endpoint = `update_address?customer=${customerId}`;
      payload = {
        id: editingAddress.id, // Make sure to provide the address id to update
        address: addressPayload
      };
    } else {
      // Endpoint and payload for adding a new address
      endpoint = `add_address?customer=${customerId}`;
      payload = {
        address: addressPayload
      };
    }

    try {
      await axios.post(`${API_ENDPOINT}${endpoint}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      handleClose();
      fetchAddresses();
      Swal.fire(
        "Success",
        isEditing
          ? "Address updated successfully"
          : "Address added successfully",
        "success"
      );
    } catch (error) {
      Swal.fire(
        "Error",
        isEditing ? "Failed to update address" : "Failed to add address",
        "error"
      );
    }
  };

  // Helper to update address fields
  const handleChange = (field) => (e) => {
    setEditingAddress({ ...editingAddress, [field]: e.target.value });
  };

  return (
    <Modal show={showModal} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>{isEditing ? "Edit Address" : "Add Address"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleAddOrUpdateAddress}>
          <Form.Group controlId="address1" className="mb-2">
            <Form.Label>Address Line 1</Form.Label>
            <Form.Control
              type="text"
              value={editingAddress.address1 || ""}
              onChange={handleChange("address1")}
              required
            />
          </Form.Group>
          <Form.Group controlId="name" className="mb-2">
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              value={editingAddress.name || ""}
              onChange={handleChange("name")}
              required
            />
          </Form.Group>
          <Form.Group controlId="pincode" className="mb-2">
            <Form.Label>Pincode</Form.Label>
            <Form.Control
              type="text"
              value={editingAddress.pincode || ""}
              onChange={handleChange("pincode")}
              required
            />
          </Form.Group>
          <Form.Group controlId="state" className="mb-2">
            <Form.Label>State</Form.Label>
            <Form.Control
              type="text"
              value={editingAddress.state || ""}
              onChange={handleChange("state")}
              required
            />
          </Form.Group>
          <Form.Group controlId="type" className="mb-2">
            <Form.Label>Type</Form.Label>
            <Form.Control
              type="text"
              value={editingAddress.type || ""}
              onChange={handleChange("type")}
              placeholder="e.g., Home, Office"
            />
          </Form.Group>
          <Form.Group controlId="phone_number" className="mb-2">
            <Form.Label>Phone Number</Form.Label>
            <Form.Control
              type="text"
              value={editingAddress.phone_number || ""}
              onChange={handleChange("phone_number")}
              placeholder="Enter phone number"
            />
          </Form.Group>
          <Button variant="primary" type="submit" className="mt-3" block="true">
            {isEditing ? "Save Changes" : "Add Address"}
          </Button>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};


