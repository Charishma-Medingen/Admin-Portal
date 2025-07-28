import React, { useEffect } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { fetchCompositionCodeHtml, getCompositionCode } from "../../api";
import Swal from "sweetalert2";

// load description based on composition code
// This function will be called when the button is clicked
// It will fetch the description based on the composition code
// and set the description in the editor
async function fetchDescriptionCC(composition_code, handleDescriptionChange) {
  try {
    const compo = await getCompositionCode(composition_code);
    // Fetch the description based on the composition code
    const html = await fetchCompositionCodeHtml(compo[0]["description_url"]);
    
    handleDescriptionChange(html);

    // This function will be called when the fetch fails
    // It will log the error to the console
  } catch (error) {
    console.error(error);
    Swal.fire({
      icon: "error",
      title: "Error",
      text: "Failed to fetch description based on composition code",
    });
  }
}

function BasicInformation({ data, handleChange, handleDescriptionChange }) {
  return (
    <>
      <div className="card-header py-3 d-flex justify-content-between bg-transparent border-bottom-0">
        <h6 className="mb-0 fw-bold ">Basic information</h6>
      </div>
      <div className="card-body">
        <form>
          <div className="row g-3 align-items-center">
          <div className="col-md-6">
              <label className="form-label">Product ID</label>
              <input
                type="text"
                className="form-control"
                name="product_id"
                value={data.product_id}
                onChange={handleChange}
                disabled
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Product name</label>
              <input
                type="text"
                className="form-control"
                name="productName"
                value={data.productName}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Salt name</label>
              <input
                type="text"
                className="form-control"
                name="saltName"
                value={data.saltName}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Composition</label>
              <input
                type="text"
                className="form-control"
                name="composition"
                value={data.composition}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Salt Code</label>
              <input
                type="text"
                className="form-control"
                name="composition_code"
                value={data.composition_code}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Schedule Category</label>
              <input
                type="text"
                className="form-control"
                name="schedule_category"
                value={data.schedule_category}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Manufacturer</label>
              <input
                type="text"
                className="form-control"
                name="manufacturer"
                value={data.manufacturer}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Marketed by</label>
              <input
                type="text"
                className="form-control"
                name="marketed_by"
                value={data.marketed_by}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Drug used for</label>
              <input
                type="text"
                className="form-control"
                name="used_for"
                value={data.used_for}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Consume Type</label>
              <input
                type="text"
                className="form-control"
                name="consumeType"
                value={data.consumeType}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Packaging</label>
              <input
                type="text"
                className="form-control"
                name="packaging"
                value={data.packaging}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <p className="m-0 fw-bold">Prescription Required</p>
              <br />
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="prescription_required"
                  value="Yes" // Set this value to Yes
                  checked={data.prescription_required === "Yes"} // Check if the current value matches Yes
                  onChange={handleChange}
                />
                <label className="form-check-label">Yes</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="prescription_required"
                  value="No" // Set this value to No
                  checked={data.prescription_required === "No"} // Check if the current value matches No
                  onChange={handleChange}
                />

                <label className="form-check-label">No</label>
              </div>
            </div>
            <div className="col-md-6">
              <p className="m-0 fw-bold">RC Product?</p>
              <br />
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="rc"
                  value="1" // Set this value to Yes
                  checked={data.rc == 1} // Check if the current value matches Yes
                  onChange={handleChange}
                />
                <label className="form-check-label">Yes</label>
              </div>
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="rc"
                  value="0" // Set this value to No
                  checked={data.rc == 0} // Check if the current value matches No
                  onChange={handleChange}
                />

                <label className="form-check-label">No</label>
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label">Manufacture date</label>
              <input
                type="date"
                className="form-control w-100"
                name="manufactureDate"
                value={data.manufactureDate}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Expiry date</label>
              <input
                type="date"
                className="form-control w-100"
                name="expiryDate"
                value={data.expiryDate}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Meta title</label>
              <input
                type="text"
                className="form-control w-100"
                name="meta_title"
                value={data.meta_title}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Meta description</label>
              <input
                type="text"
                className="form-control w-100"
                name="meta_description"
                value={data.meta_description}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Meta keywords</label>
              <input
                type="text"
                className="form-control w-100"
                name="meta_keywords"
                value={data.meta_keywords}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Formulation</label>
              <input
                type="text"
                className="form-control w-100"
                name="formulation"
                value={data.formulation}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Product URL</label>
              <input
                type="text"
                className="form-control w-100"
                name="product_name_url"
                value={data.product_name_url}
                onChange={handleChange}
              />
            </div>
            <div className="col-md-12">
              <label className="form-label">Product Description</label>
              <br />
              {/* Button to load description based on composition code */}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => fetchDescriptionCC(data.composition_code, handleDescriptionChange)}
              >
                Load Description based on Salt code
              </button>
              <br />
              <br />
              <CKEditor
                editor={ClassicEditor}
                data={data.productDescription}
                onChange={(event, editor) => {
                  const data = editor.getData();
                  handleDescriptionChange(data);
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
                    "imageTextAlternative",
                  ],
                }}
              />
            </div>
          </div>
        </form>
      </div>
    </>
  );
}

export default BasicInformation;
