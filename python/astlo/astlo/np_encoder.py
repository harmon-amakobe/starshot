
import json
import numpy as np

class NumpyEncoder(json.JSONEncoder):
    """Custom encoder to convert NumPy types to native Python types for JSON."""
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.float32, np.float64, np.floating)):
            return float(obj)
        if isinstance(obj, (np.int32, np.int64, np.integer)):
            return int(obj)
        if isinstance(obj, np.bool_):
            return bool(obj)
        return super().default(obj)

# Example output containing NumPy arrays and float64 scalars
#o#utput_dict = {
  #  "elevation_deg": np.float64(-82.04243),
   # "azimuth_deg": np.float64(267.1363),
    #"enu_vector_meters": np.array([-4.6085e10, -2.3053e09, -3.3009e11])
#}

# Write using the custom cls parameter
#with open("astlo_output.json", "w", encoding="utf-8") as f:
 #   json.dump(output_dict, f, cls=NumpyEncoder, indent=4)

