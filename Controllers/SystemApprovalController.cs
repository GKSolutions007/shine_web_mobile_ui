using ShineWebMobile.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using System.Xml.Linq;

namespace ShineWebMobile.Controllers
{
    public class SystemApprovalController : Controller
    {
        // GET: SystemApproval
        public ActionResult Index()
        {
            if (Session["LoginUserID"] == null)
            {
                return RedirectToAction("Index", "LogOn");
            }
            else
            {                
                return View();
            }
        }
    }
}