import React from 'react';
import PageHeader1 from '../../components/common/PageHeader1';
import Categories from '../../components/Products/ProductAdd/Categories';
import InventoryInfo from '../../components/Products/ProductAdd/InventoryInfo';
import PricingInfo from '../../components/Products/ProductAdd/PricingInfo';
import PublicaSchedule from '../../components/Products/ProductAdd/PublicSchedule';
import Size from '../../components/Products/ProductAdd/Size';
import Tags from '../../components/Products/ProductAdd/Tags';
import VisibilityStatus from '../../components/Products/ProductAdd/VisibilityStatus';
import BasicInformation from '../../components/Products/ProductAdd/BasicInformation';
import ShippingCountries from '../../components/Products/ProductAdd/ShippingCountry';
import Images from '../../components/Products/ProductAdd/Images';
import CroppedImages from '../../components/Products/ProductAdd/CroppedImages';
import { useState } from 'react';
import { updateProducts, uploadFile } from '../../components/api';
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
const MySwal = withReactContent(Swal)


function ProductAdd() {

    const [inventoryData, setInventoryData] = useState({
        rackId: '',
        totalStockQuantity: '',
        departmentId: '',
        selectedCategory: '',
        productPriceOld: '',
        productPriceNew: '',
        productCoupon: '',
        productName: '',
        saltName: '',
        composition: '',
        composition_code: '',
        schedule_category: '',
        marketed_by: '',
        used_for: '',
        prescription_required: 'Yes',
        manufacturer: '',
        consumeType: '',
        packaging: '',
        manufactureDate: '',
        expiryDate: '',
        productDescription: '',
        visibilityStatus: 'Published',
        publishDate: '',
        publishTime: '',
        tags: [],
        images: [],
        rc: 1,
        meta_title: '',
        meta_description: '',
        meta_keywords: '',
        product_name_url: '',
        formulation: '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setInventoryData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleCategoryChange = (category) => {
        setInventoryData(prevState => ({
            ...prevState,
            selectedCategory: category
        }));
    };

    const handleDescriptionChange = (data) => {
        setInventoryData(prevState => ({
            ...prevState,
            productDescription: data
        }));
    };

    const handleVisibilityChange = (e) => {
        setInventoryData(prevState => ({
            ...prevState,
            visibilityStatus: e.target.value
        }));
    };

    const handleTagsChange = (tags) => {
        setInventoryData(prevState => ({
            ...prevState,
            tags: tags
        }));
    };

    const handleImagesChange = (images) => {
        setInventoryData(prevState => ({
            ...prevState,
            images: images
        }));
    };

    const handleAdd = async () => {
        let inventory = {...inventoryData}
        // iterate over images and upload them
        for (let i = 0; i < inventory.images.length; i++) {
                            // Loader for image upload with image number and total images
                            Swal.fire({
                                title: 'Uploading Images',
                                html: `Uploading image ${i + 1} of ${inventory.images.length}`,
                                allowOutsideClick: false,
                                showConfirmButton: false,
                                willOpen: () => {
                                    Swal.showLoading();
                                }
                            });
            
            const result = await uploadFile(inventory.images[i].img[0], "products");
            inventory.images[i].img = result;
        }
        
        
        Swal.fire({
            title: 'Updating description',
            html: `Uploading description...`,
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });

        // convert long description into html file and upload it name it random alphanumeric string
        const blob = new Blob([inventory.productDescription], { type: 'text/html' });
        const result = await uploadFile(blob, "product_description");
        inventory.productDescription = result;

        
        Swal.fire({
            title: 'Updating product details',
            html: `Uploading products...`,
            allowOutsideClick: false,
            showConfirmButton: false,
            willOpen: () => {
                Swal.showLoading();
            }
        });



        // upload data to server
        updateProducts(inventory).then((response) => {
            console.log(response);
            MySwal.fire({
                icon: 'success',
                title: 'Product Added Successfully',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.reload();
            }
            )
        }
        ).catch((error) => {
            console.log(error);
            MySwal.fire({
                icon: 'error',
                title: 'Product Added Failed',
                showConfirmButton: false,
                timer: 1500
            })
        }  
    );
        
        
    };

    
    return (
        <div className="container-xxl">
            <PageHeader1 pagetitle='Products Add' button={false} />
            <div className="row g-3">
                <div className="col-xl-4 col-lg-4">
                    <div className="sticky-lg-top">
                        <div className="card mb-3">
                            <PricingInfo data={inventoryData} handleChange={handleChange} />
                        </div>
                        <div className="card mb-3">
                            <VisibilityStatus visibilityStatus={inventoryData.visibilityStatus} handleVisibilityChange={handleVisibilityChange}/>
                        </div>
                        {/* <div className="card mb-3">
                            <Size />
                        </div> */}
                        <div className="card mb-3">
                            <Tags tags={inventoryData.tags} handleTagsChange={handleTagsChange} />
                        </div>
                        <div className="card mb-3">
                            <Categories  selectedCategory={inventoryData.selectedCategory} handleCategoryChange={handleCategoryChange}/>
                        </div>
                        <div className="card">
                            <InventoryInfo data={inventoryData} handleChange={handleChange} />
                        </div>
                    </div>
                </div>
                <div className="col-xl-8 col-lg-8">
                <div className="card offset-md-9 col-md-3">
                     <input className="btn btn-primary me-1" type="button" value="Add Product" onClick={() => {handleAdd()}}/>
                     </div><br/>

                    <div className="card mb-3">
                        <BasicInformation data={inventoryData} handleChange={handleChange} handleDescriptionChange={handleDescriptionChange}/>
                    </div>
                    {/* <div className="card mb-3">
                        <ShippingCountries />
                    </div> */}
                    <div className="card mb-3">
                        <Images images={inventoryData.images} handleImagesChange={handleImagesChange}/>
                    </div>
                    {/* <div className="card">
                        <CroppedImages />
                    </div> */}
                    
                </div>
            </div>
        </div>
    )
}
export default ProductAdd;