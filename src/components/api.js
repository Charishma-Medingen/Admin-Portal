import md5 from "crypto-js/md5";
import axios from "axios";
import Cookies from "js-cookie";
// import Swal from "sweetalert2";

// export const API_ENDPOINT = 'https://medingen.in/api/';
export const API_ENDPOINT = "http://localhost:8000/api/";


const handleSignOut = (navigate) => {
  Cookies.remove("jwt_token");
  Cookies.remove("username");
  Cookies.remove("email");
};

// function to check if cookie exists
const checkLogin = () => {
  if (Cookies.get("jwt_token")) {
    return Cookies.get("jwt_token");
  }
  return false;
};

export const addCustomer = async (customerData) => {
  const token = Cookies.get("jwt_token");
  try {
    const response = await axios.put(API_ENDPOINT + "customers", customerData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return response.data.message; // Assuming the API returns a message
  } catch (error) {
    console.error("Error adding customer:", error);
    throw error;
  }
};

export const editCustomer = async (customerId, customerData) => {
  const token = Cookies.get("jwt_token");
  try {
    const response = await axios.patch(
      API_ENDPOINT + `customers/${customerId}`,
      customerData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error editing customer:", error);
    throw error;
  }
};
export const getCustomerList = async (
  page = 1,
  sortColumn = "register_date_time",
  sortDirection = "desc",
  searchtext = "",
  limit = 10
) => {
  const token = Cookies.get("jwt_token");
  try {
    const response = await axios.post(
      API_ENDPOINT + "customers",
      {
        page: page,
        sortColumn: sortColumn,
        sortDirection: sortDirection,
        searchtext: searchtext,
        limit: limit,
      }, // Pass sort data
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching customers:", error);
    throw error;
  }
};

const getProductList = async (page = 1, query = "", text = "") => {
  const token = Cookies.get("jwt_token");
  try {
    const response = await axios.post(
      API_ENDPOINT + "products",
      {
        page: page,
        query: query,
        text: text,
        show_hidden: true
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json", // Set the content type to application/json
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching product list:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
};

const getProductDetails = async (product_id) => {
  const token = Cookies.get("jwt_token");
  try {
    const response = await axios.get(
      API_ENDPOINT + "product_details/" + product_id + "?show_hidden=true",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching product details:", error);
    throw error; // Re-throw the error so the caller can handle it
  }
};

const handleSignIn = async (username, password, navigate) => {
  try {
    const hashedPassword = md5(password).toString();

    const response = await axios.post(API_ENDPOINT + "login", {
      username,
      hashedPassword,
    });

    if (response.status === 200) {
      const token = response.data.token;
      Cookies.set("jwt_token", token);
      Cookies.set("username", response.data.username);
      Cookies.set("email", response.data.email);
      navigate("/product-list");
    } else {
      // Swal.fire({
      //   title: "Error!",
      //   text: "Invalid username or password. Please try again.",
      //   icon: "error",
      //   confirmButtonText: "Try again",
      // });
    }
  } catch (error) {
    if (error.response && error.response.status === 401) {
      // Swal.fire({
      //   title: "Error!",
      //   text: "Invalid username or password. Please try again.",
      //   icon: "error",
      //   confirmButtonText: "Try again",
      // });
    } else {
      // Swal.fire({
      //   title: "Error!",
      //   text: "Error accessing the backend",
      //   icon: "error",
      //   confirmButtonText: "Try again later",
      // });
    }
  }
};

const getNotifications = async (page = 1) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.get(
    API_ENDPOINT + "notifications?page=" + page,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const getCategories = async () => {
  const token = Cookies.get("jwt_token");
  const response = await axios.get(API_ENDPOINT + "categories", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};


export const getUploadStatus = async () => {
  const token = Cookies.get("jwt_token");
  const response = await axios.get(API_ENDPOINT + "product_upload_status", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};


const updateProducts = async (inventoryData) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.post(
    API_ENDPOINT + "update_create_product",
    inventoryData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

const deleteProduct = async (product_id) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.delete(
    API_ENDPOINT + "delete_product/" + product_id,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

function generateRandomFileName() {
  const randomString = Math.random().toString(36).substring(2, 8);
  return `file_${randomString}`;
}

// async function uploadFile(file, prefix, customer_id, random=true) {
//   try {
//     const token = Cookies.get("jwt_token");

//     // Request pre-signed URL from Flask API
//     const response = await axios.get(API_ENDPOINT + "generate_presigned_url", {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },

//       params: {
//         file_name: file.name || generateRandomFileName(),
//         content_type: file.type,
//         prefix: prefix,
//         random: random,
//         customer_id: customer_id
//       },
//     });

//     const { presigned_url, file_name } = response.data;

//     // Use the pre-signed URL to upload the file to S3
//     const uploadResponse = await axios.put(presigned_url, file, {
//       headers: {
//         "Content-Type": file.type,
//       },
//     });

//     if (uploadResponse.status === 200) {
//       console.log("File uploaded successfully with name:", file_name);
//       return file_name;
//     } else {
//       // Swal.fire({
//       //   title: "Error!",
//       //   text: "File upload failed " + uploadResponse.statusText,
//       //   icon: "error",
//       //   confirmButtonText: "Okay",
//       // });
//     }
//   } catch (error) {
//     console.error("Error uploading file:", error);
//     // Swal.fire({
//     //   title: "Error!",
//     //   text: "Error uploading file. Try again later",
//     //   icon: "error",
//     //   confirmButtonText: "Okay",
//     // });
//   }
// }

// Charishma 
async function uploadFile(file, prefix, customer_id, random=true) {
  try {
    const token = Cookies.get("jwt_token");

    // Request pre-signed URL from Flask API
    const response = await axios.get(API_ENDPOINT + "generate_presigned_url", {
      headers: {
        Authorization: `Bearer ${token}`,
      },

      params: {
        file_name: file.name || generateRandomFileName(),
        content_type: file.type,
        prefix: prefix,
        random: random,
        customer_id: customer_id
      },
    });

    const { presigned_url, file_name } = response.data;

    // Use the pre-signed URL to upload the file to S3
    // const uploadResponse = await axios.put(presigned_url, file, {
    //   headers: {
    //     "Content-Type": file.type,
    //   },
    // });

    const uploadResponse={
      status: 200,
    }

    if (uploadResponse.status === 200) {
      console.log("File Uploaded Successfully...");

      const s3_url = presigned_url.split("?")[0]; // Clean URL
  const payload = {
    prescription_image_url: s3_url,
    prescription_date: new Date().toISOString().split("T")[0], // "YYYY-MM-DD"
    prescription_status: "uploaded",
    prescription_comments: "", // or user input
    customer_id: customer_id,
    last_used_date: null,
    prescription_name: file.name, // or any custom name
    associated_products: "" // or optional list if needed
  };

  // Send it to backend
  await axios.post(API_ENDPOINT + "save_prescription", payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
  });

      return file_name;
    } else {
      // Swal.fire({
      //   title: "Error!",
      //   text: "File upload failed " + uploadResponse.statusText,
      //   icon: "error",
      //   confirmButtonText: "Okay",
      // });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    // Swal.fire({
    //   title: "Error!",
    //   text: "Error uploading file. Try again later",
    //   icon: "error",
    //   confirmButtonText: "Okay",
    // });
  }
}

// Charishma

export const getAllCategories = async () => {
  const token = Cookies.get("jwt_token");
  const response = await axios.get(`${API_ENDPOINT}all_categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const addCategory = async (categoryData) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.post(
    `${API_ENDPOINT}add_category`,
    categoryData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const editCategory = async (category_id, categoryData) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.put(
    `${API_ENDPOINT}edit_category/${category_id}`,
    categoryData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const deleteCategory = async (category_id) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.delete(
    `${API_ENDPOINT}delete_category/${category_id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getAllBlogCategories = async () => {
  const token = Cookies.get("jwt_token");
  const response = await axios.get(`${API_ENDPOINT}all_blog_categories`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const addBlogCategory = async (categoryData) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.post(
    `${API_ENDPOINT}add_blog_category`,
    categoryData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const editBlogCategory = async (id, categoryData) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.put(
    `${API_ENDPOINT}edit_blog_category/${id}`,
    categoryData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const deleteBlogCategory = async (id) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.delete(
    `${API_ENDPOINT}delete_blog_category/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getAllCompositionCodes = async () => {
  const token = Cookies.get("jwt_token");
  const response = await axios.get(`${API_ENDPOINT}all_composition_codes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const getCompositionCode = async (composition_code) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.post(
    `${API_ENDPOINT}get_composition_code/`,
    { composition_code },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const fetchCompositionCodeHtml = async (description_url) => {
  try {
    const response = await axios.get(
      `https://d26lh6sqkii1nb.cloudfront.net/product_description/` +
        description_url,
      {}
    );
    return response.data; // Adjust based on your API response structure
  } catch (error) {
    console.error("Error fetching composition code description:", error);
  }
};

export const addCompositionCode = async (compositionCodeData) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.post(
    `${API_ENDPOINT}add_composition_code`,
    compositionCodeData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const editCompositionCode = async (id, compositionCodeData) => {
  console.log(compositionCodeData);
  const token = Cookies.get("jwt_token");
  const response = await axios.put(
    `${API_ENDPOINT}edit_composition_code/${id}`,
    compositionCodeData,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const deleteCompositionCode = async (id) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.delete(
    `${API_ENDPOINT}delete_composition_code/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};

export const getAllBlogs = async () => {
  const token = Cookies.get("jwt_token");
  const response = await axios.get(`${API_ENDPOINT}all_blogs?show_hidden=${true}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

// Fetch blog HTML content
export const fetchBlogHtml = async (description_url) => {
  try {
    const response = await axios.get(
      `https://d26lh6sqkii1nb.cloudfront.net/blogs/description/` +
        description_url
    );
    return response.data;
  } catch (error) {
    console.error("Error fetching blog description:", error);
  }
};

// Add a new blog
export const addBlog = async (blogData) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.post(`${API_ENDPOINT}add_blog`, blogData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

// Edit an existing blog
export const editBlog = async (id, blogData) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.put(`${API_ENDPOINT}edit_blog/${id}`, blogData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  return response.data;
};

// Delete a blog
export const deleteBlog = async (id) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.delete(`${API_ENDPOINT}delete_blog/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

export const cart_status_update = async (cart_id, cart_status) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.post(
    `${API_ENDPOINT}cart_status_update`,
    {
      cart_id: cart_id,
      cart_status: cart_status,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};


export const update_delivery_charge = async (cart_id, shipping_charge) => {
  const token = Cookies.get("jwt_token");
  const response = await axios.post(
    `${API_ENDPOINT}update_delivery_charge`,
    {
      cart_id: cart_id,
      shipping_charge: shipping_charge,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return response.data;
};



export {
  checkLogin,
  handleSignIn,
  getNotifications,
  getCategories,
  uploadFile,
  updateProducts,
  getProductList,
  getProductDetails,
  deleteProduct,
};
