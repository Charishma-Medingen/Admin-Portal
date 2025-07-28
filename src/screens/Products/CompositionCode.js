import React, { useState, useEffect } from "react";
import { Modal, Form } from "react-bootstrap";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import PageHeader1 from "../../components/common/PageHeader1";
import Swal from "sweetalert2";
import {
  getAllCompositionCodes,
  addCompositionCode,
  editCompositionCode,
  deleteCompositionCode,
  fetchCompositionCodeHtml
} from "../../components/api"; // Assume these API functions are defined
import { uploadFile } from "../../components/api"; // Assume this utility is defined
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

const CompositionCode = () => {
  const [tableData, setTableData] = useState([]);
  const [isAddModal, setIsAddModal] = useState(false);
  const [isEditModal, setIsEditModal] = useState(false);
  const [compositionCodeData, setCompositionCodeData] = useState(null);
  const [newCompositionCode, setNewCompositionCode] = useState({
    composition_code: "",
    composition: "",
    description_url: "",
    rc: "",
    packaging: "",
  });
  const [searchText, setSearchText] = useState("");

  const navigate = useNavigate();

  const fetchCompositionCodes = async () => {
    try {
      const response = await getAllCompositionCodes();
      setTableData(response);
    } catch (error) {
      Swal.fire("Error", "Failed to load composition codes", "error");
    }
  };

  useEffect(() => {
    fetchCompositionCodes();
  }, []);
  const handleAddCompositionCode = async () => {
    try {
      // Convert the CKEditor output to a Blob object
      if (newCompositionCode.description_url) {
        const blob = new Blob([newCompositionCode.description_url], { type: 'text/html' });
        const file = new File([blob], 'description.html', { type: 'text/html' });
        const fileUrl = await uploadFile(file, "product_description");
        newCompositionCode.description_url = fileUrl;
      }
  
      await addCompositionCode(newCompositionCode);
      setIsAddModal(false);
      fetchCompositionCodes();
      Swal.fire("Success", "Salt Code added successfully", "success");
    } catch (error) {
      Swal.fire("Error", "Failed to add composition code", "error");
    }
  };
  
  const handleEditCompositionCode = async (applyall=false) => {
    try {
      if (!compositionCodeData) return;
  
      // Convert the CKEditor output to a Blob object
      if (compositionCodeData.description_url) {
        const blob = new Blob([compositionCodeData.description_url], { type: 'text/html' });
        const file = new File([blob], 'description.html', { type: 'text/html' });
        const fileUrl = await uploadFile(file, "product_description");
        compositionCodeData.description_url = fileUrl;
        compositionCodeData.applyall = applyall;
      }
  
      await editCompositionCode(compositionCodeData.id, compositionCodeData);
      setIsEditModal(false);
      fetchCompositionCodes();
      Swal.fire("Success", "Salt Code updated successfully", "success");
    } catch (error) {
      // raise error on console
      Swal.fire("Error", "Failed to update composition code", "error");
    }
  };

  

  const handleDeleteCompositionCode = async (id) => {
    const confirmed = await Swal.fire({
      title: "Are you sure?",
      text: "This will delete the composition code.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
    });

    if (confirmed.isConfirmed) {
      await deleteCompositionCode(id);
      fetchCompositionCodes();
      Swal.fire("Deleted", "Salt Code deleted successfully", "success");
    }
  };

  const filteredData = tableData.filter((item) =>
    item.composition_code.toLowerCase().includes(searchText.toLowerCase()) ||
    item.composition.toLowerCase().includes(searchText.toLowerCase()) ||
    item.packaging.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      name: "ID",
      selector: (row) => row.id,
      sortable: true,
    },
    {
      name: "Salt Code",
      selector: (row) => row.composition_code,
      sortable: true,
    },
    {
      name: "Salt name",
      selector: (row) => row.composition,
      sortable: true,
    },
    {
      name: "Description URL",
      selector: (row) => row.description_url,
      cell: (row) => (
        <a href={"https://d26lh6sqkii1nb.cloudfront.net/product_description/" + row.description_url} target="_blank" rel="noopener noreferrer">
          View
        </a>
      ),
      sortable: false,
    },
    {
        name: "Actions",
        cell: (row) => (
          <>
            <button
              onClick={async () => {
                // Load the HTML content before opening the modal
                const htmlContent = await fetchCompositionCodeHtml(row.description_url);
                setCompositionCodeData({ ...row, description_url: htmlContent });
                setIsEditModal(true);
              }}
              className="btn btn-outline-primary"
            >
              Edit
            </button>
            <button onClick={() => handleDeleteCompositionCode(row.id)} className="btn btn-outline-danger">
              Delete
            </button>
          </>
        ),
      }
        ];

  return (
    <div className="body d-flex py-lg-3 py-md-2">
      <div className="container-xxl">
        <PageHeader1
          pagetitle="Salt Codes"
          modalbutton={() => (
            <div className="col-auto d-flex w-sm-100">
              <button
                type="button"
                onClick={() => setIsAddModal(true)}
                className="btn btn-primary btn-set-task w-sm-100"
              >
                <i className="icofont-plus-circle me-2 fs-6"></i>Add Salt Code
              </button>
            </div>
          )}
        />
        
        {/* Search Input */}
        <div className="row mb-3">
          <div className="col-sm-12">
            <input
              type="text"
              className="form-control"
              placeholder="Search composition codes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>

        <div className="row clearfix g-3">
          <div className="col-sm-12">
            <div className="card mb-3">
              <div className="card-body">
                <DataTable
                  columns={columns}
                  data={filteredData}
                  pagination
                  highlightOnHover={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

<Modal show={isAddModal} onHide={() => setIsAddModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Add Salt Code</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form>
      <Form.Group>
        <Form.Label>Salt Code</Form.Label>
        <Form.Control
          type="text"
          value={newCompositionCode.composition_code}
          onChange={(e) => setNewCompositionCode({ ...newCompositionCode, composition_code: e.target.value })}
        />
      </Form.Group>
      <Form.Group>
        <Form.Label>Composition</Form.Label>
        <Form.Control
          type="text"
          value={newCompositionCode.composition}
          onChange={(e) => setNewCompositionCode({ ...newCompositionCode, composition: e.target.value })}
        />
      </Form.Group>
      <Form.Group>
        <Form.Label>Description</Form.Label>
        <CKEditor
          editor={ClassicEditor}
          data={newCompositionCode.description_url || ""}
          onChange={(event, editor) => {
            const data = editor.getData();
            setNewCompositionCode({ ...newCompositionCode, description_url: data });
          }}
          config={{
            height: 700,
            toolbar: [
              "heading",
              "|",
              "bold",
              "italic",
              "link",
              "bulletedList",
              "numberedList",
              "|",
              "imageUpload",
              "blockQuote",
              "insertTable",
              "|",
              "imageTextAlternative"
            ]
          }}
        />
      </Form.Group>
      <button type="button" className="btn btn-primary" onClick={handleAddCompositionCode}>
        Add Salt Code
      </button>
    </Form>
  </Modal.Body>
</Modal>

<Modal show={isEditModal} onHide={() => setIsEditModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Edit Salt Code</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <Form>
      <Form.Group>
        <Form.Label>Salt Code</Form.Label>
        <Form.Control
          type="text"
          value={compositionCodeData?.composition_code || ""}
          onChange={(e) => setCompositionCodeData({ ...compositionCodeData, composition_code: e.target.value })}
        />
      </Form.Group>
      <Form.Group>
        <Form.Label>Composition</Form.Label>
        <Form.Control
          type="text"
          value={compositionCodeData?.composition || ""}
          onChange={(e) => setCompositionCodeData({ ...compositionCodeData, composition: e.target.value })}
        />
      </Form.Group>
      <Form.Group>
        <Form.Label>Description</Form.Label>
        <CKEditor
          editor={ClassicEditor}
          data={compositionCodeData?.description_url || ""}
          onChange={(event, editor) => {
            const data = editor.getData();
            setCompositionCodeData({ ...compositionCodeData, description_url: data });
          }}
          config={{
            height: 700,
            toolbar: [
              "heading",
              "|",
              "bold",
              "italic",
              "link",
              "bulletedList",
              "numberedList",
              "|",
              "imageUpload",
              "blockQuote",
              "insertTable",
              "|",
              "imageTextAlternative"
            ]
          }}
        />
      </Form.Group>
      <br/>
      <button type="button" className="btn btn-primary" onClick={()=>{handleEditCompositionCode(false)}}>
        Update Salt Code
      </button><br/>
      <br/>
      Update and Apply description to all products with this given Composition name: <b>{compositionCodeData?.composition || ""}</b> <br/><br/>
      <button type="button" className="btn btn-primary" onClick={()=>{handleEditCompositionCode(true)}}>
        Apply to all
      </button>
    </Form>
  </Modal.Body>
</Modal>

    </div>
  );
};

export default CompositionCode;
