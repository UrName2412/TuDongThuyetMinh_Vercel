function onScanSuccess(decodedText, decodedResult) {
    console.log(`Scan result: ${decodedText}`, decodedResult);
    const resultsDiv = document.getElementById('qr-reader-results');
    resultsDiv.innerHTML = `Đã quét thành công! Đang chuyển hướng...`;
    resultsDiv.style.color = 'green';

    try {
        const url = new URL(decodedText);
        const poiId = url.searchParams.get('poi');

        if (poiId) {
            // Chuyển hướng đến bản đồ và làm nổi bật POI
            // Dùng localStorage để truyền ID qua trang bản đồ
            localStorage.setItem('scannedPoiId', poiId);
            window.location.href = `../map/map.html`;
        } else {
            resultsDiv.innerHTML = 'Mã QR không hợp lệ (thiếu ID của POI).';
            resultsDiv.style.color = 'red';
        }
    } catch (e) {
        resultsDiv.innerHTML = `Lỗi khi xử lý mã QR: ${decodedText}`;
        resultsDiv.style.color = 'red';
    }

    // Dừng quét sau khi thành công
    html5QrcodeScanner.clear();
}

function onScanFailure(error) {
    // Bỏ qua lỗi "QR code not found" vì nó xuất hiện liên tục khi không có gì để quét
    if (!error.includes("QR code not found")) {
        console.warn(`QR error = ${error}`);
        const resultsDiv = document.getElementById('qr-reader-results');
        resultsDiv.innerHTML = `Lỗi quét: ${error}`;
        resultsDiv.style.color = 'red';
    }
}

// Khởi tạo và chạy trình quét
// Tham số thứ hai là cấu hình, ở đây ta giới hạn camera sau (environment)
// Tham số thứ ba là `verbose`, bật để debug
const html5QrcodeScanner = new Html5QrcodeScanner(
    "qr-reader", { fps: 10, qrbox: 250, facingMode: "environment" }, true);

html5QrcodeScanner.render(onScanSuccess, onScanFailure);
