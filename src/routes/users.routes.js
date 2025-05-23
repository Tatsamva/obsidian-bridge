import { Router } from "express";
import { player_joined,player_left,checkLinkStatus,checkcodeStatus,linkPlayer,player_death,player_coord,setHome, getHome} from "../controllers/user.controllers.js";
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
router.route("/death").post(player_death);
router.route("/coord").post(player_coord);
router.route("/sethome").post(setHome);
router.get("/gethome/:uuid", getHome);
export default router
