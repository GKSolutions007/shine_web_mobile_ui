//jQuery(document).ready(function () {

function Trimvalues(){
    $("input,textarea").each(function() {
        $(this).val($.trim($(this).val()));
    });
}
function MobilenoValidation(value, errordiv, IsMandatory) {
        if (IsMandatory && value.val().length < 10) {
            //alert('Mobile no in 10 digits');
            $(errordiv).html('* Mobile Number should contain 10 or 12 digits ')
            return false;
        }
        else if (!IsMandatory && (value.val().length >= 1 && value.val().length < 10)) {
            $(errordiv).html('* Mobile Number should contain 10 or 12 digits ')
            return false;
        }
        return true;
    }
    function MandatoryValidation(value, errordiv) {        
        if (value.val() == '') {
            $(errordiv).html('* Field Should not be Empty')
            return false;
        }        
        return true;
    }
    function EmailValidation(value, errordiv, IsMandatory) {       
        var strRegex = /^([a-zA-Z0-9_\.\-\+])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
        if (IsMandatory && !strRegex.test(value.val())) {
            $(errordiv).html('* Invalid Email Format (Ex. example@email.com)')
            return false;
        }
        else if (IsMandatory && value.val().length == 0) {
            $(errordiv).html('* Email ID should not be empty')
            return false;
        }
        else if (!IsMandatory && !strRegex.test(value.val()) && value.val().length > 0) {
            $(errordiv).html('* Invalid Email Format (Ex. example@email.com)')
            return false;
        }
        return true;
    }
    function ComparePassword(value1, value2, errordiv) {
        if (value1.val() != value2.val()) {
            $(errordiv).html('* Password and Confirm Password Should be Same')
            return false;
        }
        return true;
    }
    function AadharValidation(value, errordiv) {
        var strRegex = /^([[0-9]{12})+$/;
        if (!strRegex.test(value.val())) {// && value.val().length > 0
            $(errordiv).html('* Aadhar Number Should be 12 Digits')
            return false;
        }
        return true;
    }
    function PANValidation(value, errordiv, IsMandatory) {
        var strRegex = /^([a-zA-Z]{5}\d{4}[a-zA-Z]{1})+$/;

        if (IsMandatory && !strRegex.test(value.val())) {
            $(errordiv).html('*PAN must 10 characters (alphabets-5 numeric-4 alphabet-1)');
            return false;
        }
        else if (!IsMandatory && !strRegex.test(value.val()) && value.val().length > 0) {
            $(errordiv).html('*PAN must 10 characters (alphabets-5 numeric-4 alphabet-1)');
            return false;
        }
        return true;
    }
    function MICRValidation(value, errordiv) {
        var strRegex = /^([[0-9]{9})+$/;
        if (!strRegex.test(value.val()) && value.val().length > 0) {
            $(errordiv).html('* MICR Should be 9 Digits')
            return false;
        }
        return true;
    }
    function IFSCValidation(value, errordiv) {
        var strRegex = /^([a-zA-Z]{4}[0-9A-Za-z]{7})+$/;
        if (!strRegex.test(value.val()) && value.val().length > 0) {
            $(errordiv).html('*Invalid IFSC format (alphabets-4, alphanumeric-7)')
            return false;
        }
        return true;
    }
    function GSTINValidation(value, errordiv) {
        var strRegex = /^([0-9]{2}[a-zA-Z]{5}[0-9]{4}[a-zA-Z]{1}[0-9a-zA-Z]{3})+$/;
        if (!strRegex.test(value.val()) && value.val().length > 0) {
            $(errordiv).html('GSTIN Number Must 15 characters (Numeric-2 Alpha-5 Numeric-4 Alpha-1 AlphaNumeric-3)')
            return false;
        }
        return true;
    }
    function DispalyCount(val1,val2,val3,Title) {
        var countof = '<table class="table table-hover table-bordered" style="width:100%;"><th style="text-align:center;background-color: skyblue">Total </th><th style="text-align:center;background-color: skyblue">Active </th><th style="text-align:center;background-color: skyblue">In-Active </th><tr><td style="text-align:center"><label id="totcount" style="text-align:center;color:orange;font-size:30px"> ' + val1 + ' </label></td><td style="text-align:center"><label id="Actcount" style="text-align:center;color:forestgreen;font-size:30px">' + val2 + ' </label></td><td style="text-align:center"><label id="Inactcount" style="text-align:center;color:hotpink;font-size:30px">' + val3 + ' </label></td></tr></table>';
        var titlec = '<p style="font-size:15px"><b>Count of ' + Title + ' :</b></p>';
        return titlec + countof;
    }
    function FSSAIValidation(value, errordiv) {
        var strRegex = /^([[0-9]{14})+$/;
        if (!strRegex.test(value.val()) && value.val().length > 0) {
            $(errordiv).html('*Invalid FSSAI format (14 Numerics Only)')
            return false;
        }
        return true;
    }
    function PINCodeValidation(value, errordiv) {
        var strRegex = /^([[0-9]{6})+$/;
        if (!strRegex.test(value.val()) && value.val().length > 0) {
            $(errordiv).html('*Invalid PIN Code format (6 Numerics Only)')
            return false;
        }
        return true;
    }
    function SetValueZeorforfield(values) {
        for (var i = 0; i < values.length; i++) {
            if (values[i][0].value == "") {
                values[i][0].value('0');
            }
        }
    }
    function getCurrentDate() {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();
        if (dd < 10) {
            dd = '0' + dd;
        }

        if (mm < 10) {
            mm = '0' + mm;
        }
        today = yyyy + '-' + mm + '-' + dd;        
        return today;
}
//@Session["F_SD"];

    function NumericOnlyKeypress(key, errorMsgDiv) {
        $(errorMsgDiv).html('');
        if ((key.charCode < 48 || key.charCode > 57) /* Numeric */
            && (key.keyCode != 13)  /* Enter */ && key.which != 8 /* Back Space */
            && key.keyCode != 9 /* Tab */ //&& key.keyCode != 116 /* F5 */
            ) {
            key.preventDefault();
            $(errorMsgDiv).html('* Invalid Key');
            return false;
        }
    }
    function NumaricWithDecimalValue(key, errorMsgDiv) {
        $(errorMsgDiv).html('');
        if ((key.charCode < 48 || key.charCode > 57) /* Numeric */
            && (key.charCode != 46)  /* . */
            && (key.keyCode != 13)  /* Enter */ && key.which != 8 /* Back Space */
            && key.which != 32 /* Space */ && key.keyCode != 37 /* Left Arrow */
            && key.keyCode != 38 /* Up Arrow */ && key.keyCode != 39 /* Right Arrow */
            && key.keyCode != 40 /* Down Arrow */ && key.keyCode != 9 /* Tab */
            //&& key.keyCode != 116 /* F5 */
            ) {
            key.preventDefault();
            $(errorMsgDiv).html('* Invalid Key');
            return false;
        }
    }

        function AlphaNumericKeypress(key, errorMsgDiv) {
            $(errorMsgDiv).html('');
            if ((key.charCode < 48 || key.charCode > 57) /* Numeric */
                && (key.charCode < 65 || key.charCode > 90) /* Upper Alpha */
                && (key.charCode < 97 || key.charCode > 122) /* Lower Alpha */
                && key.keyCode != 116 /* F5 */
                ) {
                key.preventDefault();
                $(errorMsgDiv).html('* Invalid Key');
                return false;
            }
        }
        function AlphabetwithDotKeypress(key, errorMsgDiv) {
            $(errorMsgDiv).html('');
            if ((key.charCode < 65 || key.charCode > 90) /* Upper Alpha */
                && (key.charCode < 97 || key.charCode > 122) /* Lower Alpha */
                && key.keyCode != 190 /* . */
                ) {
                key.preventDefault();
                $(errorMsgDiv).html('* Invalid Key');
                return false;
            }
        }
    
    function AlphaNumaricWithSplCharKeypress(key, errorMsgDiv) {
        $(errorMsgDiv).html('');
        if ((key.charCode < 48 || key.charCode > 57) /* Numeric */
            && (key.charCode < 65 || key.charCode > 90) /* Upper Alpha */
            && (key.charCode < 97 || key.charCode > 122) /* Lower Alpha */
            && (key.charCode != 126) /* ~ */ && (key.charCode != 64)  /* @@ */
            && (key.charCode != 37)  /* % */ && (key.charCode != 38)  /* & */
            && (key.charCode != 42)  /* * */ && (key.charCode != 40)  /* ( */
            && (key.charCode != 41)  /* ) */ && (key.charCode != 45)  /* - */
            && (key.charCode != 95)  /* _ */ && (key.charCode != 47)  /* / */
            && (key.charCode != 46)  /* . */ && (key.charCode != 44)  /* , */
            && (key.keyCode != 13)  /* Enter */ && key.which != 8 /* Back Space */
            && key.which != 32 /* Space */ && key.keyCode != 37 /* Left Arrow */
            && key.keyCode != 38 /* Up Arrow */ && key.keyCode != 39 /* Right Arrow */
            && key.keyCode != 40 /* Down Arrow */ && key.keyCode != 9 /* Tab */
            && key.keyCode != 116 /* F5 */
            ) {
            key.preventDefault();
            $(errorMsgDiv).html('* Invalid Key');
            return false;
        }
    }
    function SetTagFocusInOut(FromID, ToID, FocusMode,Round) {
        if (FocusMode == 1) {//focus out
            var FromVal = parseFloat($(FromID).val());
            var rrv = parseFloat(FromVal).toFixed(Round);
            $(ToID).val(FromVal);
            $(FromID).val(rrv);
        } else if (FocusMode == 2) { // focus IN
            var ToVal = $(ToID).val();
            $(FromID).val(ToVal);
        }
    }
    function SetTagFocusInOutlbl(FromID, ToID, FocusMode, Round) {
        if (FocusMode == 1) {//focus out
            var FromVal = parseFloat($(FromID).text());
            var rrv = parseFloat(FromVal).toFixed(Round);
            $(ToID).val(FromVal);
            $(FromID).text(rrv);
        } else if (FocusMode == 2) { // focus IN
            var ToVal = $(ToID).val();
            $(FromID).text(ToVal);
        }
    }
    function setTagValue(ID, Value, Rounds) {
        if (Value != "") {
            var ids = document.getElementById(ID);
            ids.value = Value;
            ids.name = parseFloat(ids.value).toFixed(6);
            return parseFloat(ids.name).toFixed(Rounds);
        } else {
            var ids = document.getElementById(ID);
            ids.name = parseFloat(0.00).toFixed(6);
            return parseFloat(ids.name).toFixed(2);
        }
    }
    function getTagValue(ID) {
        var ids = document.getElementById(ID);
        return parseFloat(ids.name).toFixed(6);
    }
    function SetDecimalvalue(RType, Value, Decimalplaces) {
        if (RType == 1) {
            return parseFloat(Value).toFixed(6);
        } else {
            return parseFloat(Value).toFixed(Decimalplaces);
        }
    }
//});
