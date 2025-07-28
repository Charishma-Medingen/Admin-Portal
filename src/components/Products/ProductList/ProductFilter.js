import React, { Component } from 'react';
import { getCategories } from "../../api.js";
import { Query, Builder, Utils as QbUtils } from '@react-awesome-query-builder/antd';
import { AntdConfig, AntdWidgets } from '@react-awesome-query-builder/antd';

// reset.css
import 'antd/dist/reset.css'; // Ant Design styles (reset only)
import '@react-awesome-query-builder/antd/css/styles.css';
import "./filter_styles.css";

const InitialConfig = AntdConfig;

// Initial config
const config = {
  ...InitialConfig,
  fields: {
    product_id: {
      label: 'Product ID',
      type: 'number',
      valueSources: ['value'],
    },
    product_type: {
      label: 'Product Type',
      type: 'text',
    },
    name: {
      label: 'Name',
      type: 'text',
    },
    salt_name: {
      label: 'Salt Name',
      type: 'text',
    },
    composition: {
      label: 'Composition',
      type: 'text',
    },
    composition_code: {
      label: 'Salt Code',
      type: 'text',
    },
    manufacturer: {
      label: 'Manufacturer',
      type: 'text',
    },
    consume_type: {
      label: 'Consume Type',
      type: 'text',
    },
    expiry: {
      label: 'Expiry',
      type: 'date',
      valueSources: ['value'],
      preferWidgets: ['date'],
    },
    manufacture_date: {
      label: 'Manufacture Date',
      type: 'date',
      valueSources: ['value'],
      preferWidgets: ['date'],
    },
    product_entry_created_date: {
      label: 'Product Entry Created Date',
      type: 'date',
      valueSources: ['value'],
      preferWidgets: ['date'],
    },
    product_entry_updated_date: {
      label: 'Product Entry Updated Date',
      type: 'date',
      valueSources: ['value'],
      preferWidgets: ['date'],
    },
    quantity_available: {
      label: 'Quantity Available',
      type: 'number',
      valueSources: ['value'],
    },
    rack_id: {
      label: 'Rack ID',
      type: 'text',
    },
    department: {
      label: 'Department',
      type: 'number',
      valueSources: ['value'],
    },
    product_pricing_old: {
      label: 'Product Pricing Old',
      type: 'number',
      valueSources: ['value'],
    },
    product_pricing_new: {
      label: 'Product Pricing New',
      type: 'number',
      valueSources: ['value'],
    },
    product_coupon_code: {
      label: 'Product Coupon Code',
      type: 'text',
    },
    visibility_status: {
      label: 'Visibility Status',
      type: 'select',
      valueSources: ['value'],
      fieldSettings: {
        listValues: ["Published", "Hidden"],
      },
    },
    tags: {
      label: 'Tags',
      type: 'text',
    },
    categories: {
      label: 'Categories',
      type: 'text',
    },
    inventory_info_sku: {
      label: 'Inventory Info SKU',
      type: 'text',
    },
    inventory_info_total_stock: {
      label: 'Inventory Info Total Stock',
      type: 'number',
      valueSources: ['value'],
    },
    inventory_info_supplier_id: {
      label: 'Inventory Info Supplier ID',
      type: 'number',
      valueSources: ['value'],
    },
    prescription_required: {
      label: 'Prescription Required',
      type: 'boolean',
      operators: ['equal'],
      valueSources: ['value'],
    },
    reward_points_mig_coins: {
      label: 'Reward Points (Mig Coins)',
      type: 'number',
      valueSources: ['value'],
    },
    selected_category: {
      label: 'Selected Category',
      type: 'select',
      valueSources: ['value'],
      fieldSettings: {
        listValues: [],
      },
    },
    medicine_href: {
      label: 'Medicine Href',
      type: 'text',
    },
  }  
};

const queryValue = {"id": QbUtils.uuid(), "type": "group"};

class DemoQueryBuilder extends Component {
  state = {
    tree: QbUtils.loadTree(queryValue),
    config: config,
    loading: true
  };

  componentDidMount() {
    getCategories().then((data) => {
      this.setState({
        config: {
          ...this.state.config,
          fields: {
            ...this.state.config.fields,
            selected_category: {
              ...this.state.config.fields.selected_category,
              fieldSettings: {
                listValues: data
              }
            }
          }
        },
        loading: false  // Set loading to false after data is fetched
      });
    });
  }

  render() {
    if (this.state.loading) {
      return <div>Loading...</div>;
    }

    return (
      <div>
        <Query
          {...this.state.config}
          value={this.state.tree}
          onChange={this.onChange}
          renderBuilder={this.renderBuilder}
        />
      </div>
    );
  }

  renderBuilder = (props) => (
    <div className="query-builder-container" style={{padding: '10px'}}>
      <div className="query-builder qb-lite">
        <Builder {...props} />
      </div>
    </div>
  )

  onChange = (immutableTree, config) => {
    this.setState({tree: immutableTree, config: config});
    this.props.onQueryChange(immutableTree, config); // Notify parent of changes
  }
}

export default DemoQueryBuilder;
