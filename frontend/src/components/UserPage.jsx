import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";

function UserPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [formData, setFormData] = useState({
    item: "",
    price: "",
    images: [],
    description: "",
  });

  const [previewImages, setPreviewImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredItems, setFilteredItems] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const getLabel = (itm) => {
    return (itm?.name || itm?.title || itm?.item || "").toString().trim();
  };

  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get(`${API_URL}/allitemswithuser`);
        let raw = [];
        if (Array.isArray(response.data)) raw = response.data;
        else if (response.data?.data && Array.isArray(response.data.data))
          raw = response.data.data;
        else if (Array.isArray(response.data?.items)) raw = response.data.items;

        const seen = new Map();
        for (const itm of raw) {
          const label = getLabel(itm);
          const key = label.toLowerCase();
          if (!seen.has(key) && label !== "") {
            seen.set(key, itm);
          }
        }
        const deduped = Array.from(seen.values());
        setItems(deduped);
      } catch (error) {
        console.error("Error fetching items:", error);
      }
    };
    fetchItems();
  }, [API_URL]);

  useEffect(() => {
    const v = (searchTerm || "").trim().toLowerCase();

    if (v === "") {
      setFilteredItems([]);
      setShowSuggestions(false);
      return;
    }

    const matches = items.filter((itm) => {
      const label = getLabel(itm).toLowerCase();
      return label.includes(v);
    });

    const uniqueLabels = [];
    const seen = new Set();
    for (const m of matches) {
      const label = getLabel(m);
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLabels.push(label);
      }
    }

    setFilteredItems(uniqueLabels);
    setShowSuggestions(true);
  }, [searchTerm, items]);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setFormData((prev) => ({ ...prev, item: value }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (!files) return;
    const fileArray = Array.from(files);
    setFormData((prev) => ({ ...prev, images: fileArray }));
    setPreviewImages(fileArray.map((f) => URL.createObjectURL(f)));
  };

  const handleSelect = (itemName) => {
    setSearchTerm(itemName);
    setFormData((prev) => ({ ...prev, item: itemName }));

    setFilteredItems([]);
    setShowSuggestions(false);

    if (inputRef.current) {
      requestAnimationFrame(() => {
        try {
          inputRef.current.blur();
        } catch (err) {
          console.error("err", err);
        }
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!token) {
      toast.error("You must be logged in to upload items!", {
        position: "bottom-right",
      });
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();
      data.append("item", formData.item);
      data.append("price", formData.price);
      data.append("description", formData.description);
      for (let i = 0; i < formData.images.length; i++) {
        data.append("images", formData.images[i]);
      }

      await axios.post(`${API_URL}/uploaditem`, data, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Item successfully uploaded!", {
        position: "bottom-right",
        autoClose: 1500,
      });

      setFormData({ item: "", price: "", images: [], description: "" });
      setPreviewImages([]);
      setSearchTerm("");
      setFilteredItems([]);
    } catch (err) {
      if (err.response?.status === 403) {
        toast.error("Session expired. Please login again.");
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        navigate("/login");
      } else {
        toast.error(err.response?.data?.message || "Item upload failed!", {
          position: "bottom-right",
          autoClose: 2000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container vh-100 d-flex justify-content-center align-items-center">
      <div className="row w-100 justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h4 className="card-title mb-4 text-center">User Dashboard</h4>
              <form onSubmit={handleSubmit}>
                <div className="mb-3 position-relative">
                  <label className="form-label">Search Item</label>
                  <input
                    ref={inputRef}
                    type="search"
                    className="form-control"
                    placeholder="Search or enter item"
                    name="item"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onBlur={() =>
                      setTimeout(() => setShowSuggestions(false), 120)
                    }
                    onFocus={() => {
                      if (searchTerm.trim() !== "") setShowSuggestions(true);
                    }}
                    autoComplete="off"
                    required
                  />

                  {showSuggestions && (
                    <div
                      className="position-absolute w-100"
                      style={{
                        zIndex: 1000,
                        maxHeight: "220px",
                        overflowY: "auto",
                      }}
                    >
                      {filteredItems.length > 0 ? (
                        <ul className="list-group rounded-0">
                          {filteredItems.map((label, index) => (
                            <li
                              key={index}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelect(label);
                              }}
                              className="list-group-item list-group-item-action text-dark border rounded-0"
                              style={{
                                cursor: "pointer",
                                backgroundColor: "#F5F5F5",
                              }}
                            >
                              {label}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-muted small mt-1 p-2 bg-white border">
                          No results found — add "<strong>{searchTerm}</strong>"
                          manually.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Item Price</label>
                  <input
                    type="number"
                    placeholder="Enter product price"
                    className="form-control input-text"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    min="0"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Upload Images</label>
                  <input
                    type="file"
                    name="images"
                    className="form-control"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handleFileChange}
                    required
                  />
                  {previewImages.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap gap-2">
                      {Array.isArray(previewImages) &&
                        previewImages.map((src, idx) => (
                          <img
                            key={idx}
                            src={src}
                            alt={`preview-${idx}`}
                            style={{
                              width: "80px",
                              height: "80px",
                              objectFit: "cover",
                            }}
                          />
                        ))}
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    className="form-control"
                    rows="4"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Enter description..."
                    required
                    style={{ height: "70px" }}
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading}
                >
                  {loading ? "Uploading..." : "Submit"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default UserPage;
