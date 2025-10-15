import React, { useState } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

function UserPage() {
  const API_URL = import.meta.env.VITE_API_URL;

  const [formData, setFormData] = useState({
    item: "",
    images: [],
    description: "",
  });

  const [previewImages, setPreviewImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "images") {
      setFormData((prev) => ({ ...prev, images: files }));
      setPreviewImages(
        Array.from(files).map((file) => URL.createObjectURL(file))
      );
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = new FormData();
      data.append("item", formData.item);
      data.append("description", formData.description);
      for (let i = 0; i < formData.images.length; i++) {
        data.append("images", formData.images[i]);
      }

      const response = await axios.post(`${API_URL}/uploaditem`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Item successfully added!", {
        position: "bottom-right",
        autoClose: 1500,
        progress: undefined,
        closeOnClick: true,
        draggable: true,
      });

      setFormData({ item: "", images: [], description: "" });
      setPreviewImages([]);
    } catch (err) {
      console.error(err);
      toast.error("Item upload failed!", {
        position: "bottom-right",
        autoClose: 1500,
        progress: undefined,
        closeOnClick: true,
        draggable: true,
      });
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
                <div className="mb-3">
                  <label className="form-label">Select Item</label>
                  <select
                    name="item"
                    className="form-select select-items"
                    value={formData.item}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select --</option>
                    <option value="Short">Short</option>
                    <option value="Paint">Paint</option>
                    <option value="Jacket">Jacket</option>
                    <option value="Other">Other</option>
                  </select>
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
                    onChange={handleChange}
                    required
                  />
                  {previewImages.length > 0 && (
                    <div className="mt-2 d-flex flex-wrap gap-2">
                      {previewImages.map((src, idx) => (
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
                    onChange={handleChange}
                    placeholder="Enter description..."
                    required
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
