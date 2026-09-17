import { useEffect, useState } from "react";

import {
  getLoans,
} from "../../services/customerStorage";

const useLoans = () => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = async () => {
    try {
      const storedLoans = await getLoans();

      setLoans(
        Array.isArray(storedLoans)
          ? storedLoans
          : []
      );
    } catch (error) {
      console.error(
        "Failed to load loans:",
        error
      );

      setLoans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();

    const handleUpdate = () => {
      loadLoans();
    };

    window.addEventListener(
      "fleetopz:data-updated",
      handleUpdate
    );

    window.addEventListener(
      "storage",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "fleetopz:data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "storage",
        handleUpdate
      );
    };
  }, []);

  return {
    loans,
    loading,
    reloadLoans: loadLoans,
  };
};

export default useLoans;