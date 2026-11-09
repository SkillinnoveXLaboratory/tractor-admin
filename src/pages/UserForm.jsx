import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "../lib/hooks";
import { titleCase } from "../lib/format";
import { Field, Modal } from "../components/ui";
import { LocationFields, UserPicker } from "../components/forms";

const ROLE_HELP = {
  farmer: "Books tractors, buys from the marketplace and uses Agri Doctor.",
  vendor: "Lists tractors, accepts bookings and manages drivers.",
  driver: "Works for one vendor and completes assigned jobs.",
  shopkeeper: "Sells products in the marketplace (after approval).",
};

function emptyForm(user) {
  return {
    role: user?.role || "farmer",
    fullName: user?.fullName || "",
    email: user?.email || "",
    mobile: user?.mobile || "",
    password: "",
    vendorId: user?.createdByVendor?._id || user?.createdByVendor || "",
    location: { latitude: user?.location?.latitude ?? "", longitude: user?.location?.longitude ?? "", address: user?.location?.address || "" },
  };
}

// Create any app account, or edit an existing one. Roles come from the server's /meta.
export default function UserForm({ open, onClose, user, roles = ["farmer", "vendor", "driver", "shopkeeper"] }) {
  const editing = Boolean(user);
  const navigate = useNavigate();
  const action = useAction();
  const [form, setForm] = useState(() => emptyForm(user));
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  useEffect(() => {
    if (open) { setForm(emptyForm(user)); setErrors({}); setServerError(""); }
  }, [open, user]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const validate = () => {
    const next = {};
    if (form.fullName.trim().length < 2) next.fullName = "Enter the full name.";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email.";
    if (form.mobile.replace(/\D/g, "").length < 10) next.mobile = "Enter a valid mobile number.";
    if (!editing && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))) next.password = "At least 8 characters with letters and numbers.";
    if (form.role === "driver" && !form.vendorId) next.vendorId = "Choose the vendor this driver works for.";
    const { latitude, longitude } = form.location;
    if ((latitude !== "" || longitude !== "") && (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) || latitude === "" || longitude === "")) next.location = "Enter both latitude and longitude, or leave both empty.";
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const { latitude, longitude, address } = form.location;
    const body = {
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      mobile: form.mobile.trim(),
      ...(latitude !== "" && longitude !== "" ? { latitude: Number(latitude), longitude: Number(longitude), address } : {}),
      ...(form.role === "driver" ? { vendorId: form.vendorId } : {}),
    };
    setServerError("");
    try {
      if (editing) {
        await action.mutateAsync({ path: `/users/${user._id}`, method: "PATCH", body, throwOnly: true });
        onClose();
      } else {
        const data = await action.mutateAsync({ path: "/users", body: { ...body, role: form.role, password: form.password }, throwOnly: true });
        onClose();
        navigate(`/users/${data.user._id}`);
      }
    } catch (err) {
      setServerError(err.message);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="max-w-2xl"
      title={editing ? `Edit ${user.fullName}` : "New account"}
      footer={<><button type="button" className="btn-light" onClick={onClose}>Cancel</button><button type="submit" form="user-form" className="btn-primary" disabled={action.isPending}>{action.isPending && <i className="fa-solid fa-circle-notch fa-spin" />}{editing ? "Save changes" : "Create account"}</button></>}
    >
      <form id="user-form" onSubmit={submit} className="space-y-4" noValidate>
        {!editing && (
          <div>
            <span className="label">Role</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {roles.map((role) => (
                <button key={role} type="button" onClick={() => setForm({ ...form, role })} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${form.role === role ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{titleCase(role)}</button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">{ROLE_HELP[form.role]}</p>
          </div>
        )}
        {form.role === "driver" && (
          <UserPicker role="vendor" label="Vendor" value={form.vendorId} initialLabel={user?.createdByVendor?.fullName || ""} onChange={(id) => setForm((f) => ({ ...f, vendorId: id }))} error={errors.vendorId} />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" error={errors.fullName}><input className="input" maxLength={100} value={form.fullName} onChange={set("fullName")} /></Field>
          <Field label="Mobile" error={errors.mobile}><input className="input" inputMode="tel" maxLength={20} value={form.mobile} onChange={set("mobile")} /></Field>
          <Field label="Email" error={errors.email}><input className="input" type="email" value={form.email} onChange={set("email")} /></Field>
          {!editing && <Field label="Password" error={errors.password} hint="Share it with the user privately."><input className="input" type="text" autoComplete="new-password" value={form.password} onChange={set("password")} /></Field>}
        </div>
        <div>
          <p className="label">Location</p>
          <LocationFields value={form.location} onChange={(location) => setForm({ ...form, location })} />
          {errors.location && <p className="text-[11px] text-rose-500 mt-1">{errors.location}</p>}
        </div>
        {serverError && <p className="text-xs text-rose-500" role="alert">{serverError}</p>}
      </form>
    </Modal>
  );
}
