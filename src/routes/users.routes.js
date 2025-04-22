import { Router } from "express";
import { player_joined,player_left,checkLinkStatus,checkcodeStatus,linkPlayer} from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verfiyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// router.route("/register").post(upload.fields([
//     {
//         name:"avatar",
//         maxCount: 1
//     },
//     {
//         name:"coverImage",
//         maxCount: 1
//     }
// ]),registerUser);
// router.route("/pdf").get(PDF);
router.route("/playerjoined").post(player_joined);
router.route("/playerleft").post(player_left);
router.get("/check/:uuid", checkLinkStatus);
router.get("/check/:code", checkcodeStatus);
router.route("/linkplayer").post(linkPlayer);

export default router