import axios from "axios";
import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function ViewUsers() {
  const API_URL = import.meta.env.VITE_API_URL;

  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const alldata = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${API_URL}/someusers/${id}`);
        const data = Array.isArray(response.data)
          ? response.data[0] || null
          : response.data || null;
        setUser(data);
      } catch (error) {
        console.error("Error fetching employee:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (id) alldata();
  }, [API_URL, id]);

  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
        <div
          className="spinner-border text-primary"
          role="status"
          aria-hidden="true"
        />
        <span className="ms-2">Loading users...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="content-wrapper container my-5 d-flex justify-content-center align-items-center">
        <div className="alert alert-warning">Users not found.</div>
      </div>
    );
  }

  const rows = [
    { label: "Fullname", value: user.fullname || "-" },
    { label: "Email", value: user.email || "-" },
    { label: "Phone Number", value: user.phone || "-" },
    { label: "Username", value: user.username || "-" },
    { label: "Date of Joining", value: formatDate(user.doj) },
    { label: "Gender", value: user.gender || "-" },
  ];

  const handleDownloadPDF = (e) => {
    if (e && e.preventDefault) e.preventDefault();

    const s = user;
    if (!s) {
      alert("No user data to export.");
      return;
    }

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const leftMargin = 20;
      const rightMargin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const availWidth = pageWidth - leftMargin - rightMargin;
      const now = new Date();

      doc.setFontSize(16);
      doc.text("Employee Details", pageWidth / 2, 50, { align: "center" });

      doc.setFontSize(10);
      doc.text(`Generated: ${now.toLocaleString()}`, leftMargin, 70);

      const detailsRows = [
        ["Fullname", s.fullname ?? s.employee_name ?? "-"],
        ["Email", s.email ?? "-"],
        ["Phone Number", s.phone ?? s.contact ?? "-"],
        ["Username", s.username ?? "-"],
        [
          "Date of Birth",
          s.dob ? new Date(s.dob).toLocaleDateString("en-GB") : "-",
        ],
        ["Gender", s.gender ?? "-"],
      ];

      const detailsCol1 = Math.min(180, Math.floor(availWidth * 0.38));
      const detailsCol2 = availWidth - detailsCol1;

      autoTable(doc, {
        startY: 90,
        head: [["Field", "Value"]],
        body: detailsRows,
        theme: "grid",
        margin: { left: leftMargin, right: rightMargin },
        tableWidth: "auto",
        styles: {
          fontSize: 11,
          cellPadding: 8,
          valign: "middle",
          overflow: "linebreak",
          halign: "center",
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          halign: "center",
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: {
          0: { cellWidth: detailsCol1, halign: "center" },
          1: { cellWidth: detailsCol2, halign: "center" },
        },
      });

      const footerY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 40 : 220;
      doc.setFontSize(10);
      doc.text("Employer Signature: ____________________", leftMargin, footerY);
      doc.text(
        "Employee Signature: ____________________",
        pageWidth / 2,
        footerY
      );
      doc.setFontSize(9);
      doc.text(
        "This is a computer generated document.",
        leftMargin,
        footerY + 22
      );

      const safeName = (s.fullname || s.employee_name || "employee").replace(
        /\s+/g,
        "_"
      );
      const filename = `${safeName}_details_${now
        .toISOString()
        .slice(0, 10)}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error("PDF creation error:", err);
      alert("Could not create PDF. See console for details.");
    }
  };

  return (
    <div className="content-wrapper container my-5 d-flex justify-content-center">
      <div className="card shadow-sm employee-details">
        <div className="card-header text-center">
          <h5 className="mb-0">View User Details</h5>
        </div>

        <div className="card-body">
          <form>
            <div className="row g-0">
              {Array.isArray(rows) &&
                rows.map((r) => (
                  <div className="col-12" key={r.label}>
                    <div className="d-flex justify-content-between align-items-center py-2 px-2 border-bottom">
                      <span className="text-dark">{r.label}</span>
                      <span className="fw-semibold w-50 text-end text-break">
                        {r.value}
                      </span>
                    </div>
                  </div>
                ))}

              <div className="col-12 d-flex flex-row gap-3 justify-content-center mt-3">
                <Link
                  to="/admin/users"
                  className="btn btn-success text-decoration-none"
                  aria-label="Go back to admin home"
                  prefetch="intent"
                >
                  Back
                </Link>

                <button
                  type="button"
                  className="btn btn-success"
                  aria-label="Download PDF"
                  onClick={handleDownloadPDF}
                >
                  Download PDF
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ViewUsers;
