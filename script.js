// 전역 변수
let currentData = []; // 현재 업로드된 데이터
let mergedData = []; // 합쳐진 데이터 (이메일 기준 중복 제거)
let emailSet = new Set(); // 이메일 중복 체크용

// DOM 요소
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const workSection = document.getElementById('workSection');
const previewBody = document.getElementById('previewBody');
const totalCount = document.getElementById('totalCount');
const mergeBtn = document.getElementById('mergeBtn');
const subtractBtn = document.getElementById('subtractBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');
const resultInfo = document.getElementById('resultInfo');
const resultText = document.getElementById('resultText');
const mergedInfo = document.getElementById('mergedInfo');
const mergedCount = document.getElementById('mergedCount');

// 드래그앤드롭 이벤트
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}


// CSV 파일 처리
function processFile(file) {
    if (!file.name.endsWith('.csv')) {
        alert('CSV 파일만 업로드 가능합니다.');
        return;
    }

    // EUC-KR로 파일 읽기 (ArrayBuffer로 읽어서 TextDecoder 사용)
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const arrayBuffer = e.target.result;
            let text = '';
            
            // TextDecoder로 EUC-KR 디코딩 시도
            try {
                const decoder = new TextDecoder('euc-kr');
                text = decoder.decode(arrayBuffer);
            } catch (decodeError) {
                // EUC-KR 디코딩 실패 시 UTF-8로 시도
                console.warn('EUC-KR 디코딩 실패, UTF-8로 시도:', decodeError);
                const decoder = new TextDecoder('utf-8');
                text = decoder.decode(arrayBuffer);
            }
            
            const parsed = parseCSV(text);
            currentData = parsed;
            displayPreview(parsed);
            workSection.style.display = 'grid';
            resetPreviewResult(); // 합쳐진 데이터는 유지하고 미리보기 결과만 초기화
            updateMergedInfo(); // 합쳐진 데이터 정보 업데이트
        } catch (error) {
            alert('CSV 파일을 읽는 중 오류가 발생했습니다: ' + error.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

// CSV 파싱
function parseCSV(text) {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
        throw new Error('CSV 파일이 비어있습니다.');
    }

    // 헤더 확인 (선택적)
    let startIndex = 0;
    const firstLine = lines[0].toLowerCase();
    if (firstLine.includes('name') && firstLine.includes('email')) {
        // 헤더가 있으면 건너뛰기
        startIndex = 1;
    }
    // 헤더가 없으면 첫 번째 줄부터 데이터로 처리

    const data = [];
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // CSV 파싱 (쉼표로 구분, 따옴표 처리)
        const parsed = parseCSVLine(line);
        if (parsed.length >= 2) {
            const name = parsed[0].trim().replace(/^"|"$/g, '');
            const email = parsed[1].trim().replace(/^"|"$/g, '').toLowerCase();
            
            // 이름은 비어있어도 되지만, 이메일은 필수
            if (email && isValidEmail(email)) {
                data.push({ name: name || '', email });
            }
        }
    }

    return data;
}

// CSV 라인 파싱 (따옴표 처리)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    return result;
}

// 이메일 유효성 검사
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// 미리보기 표시 (상위 10개)
function displayPreview(data) {
    previewBody.innerHTML = '';
    const previewCount = Math.min(10, data.length);
    
    for (let i = 0; i < previewCount; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(data[i].name || '(이름 없음)')}</td>
            <td>${escapeHtml(data[i].email)}</td>
        `;
        previewBody.appendChild(row);
    }
    
    totalCount.textContent = `총 ${data.length}개의 데이터가 업로드되었습니다.`;
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 합치기 버튼 클릭
mergeBtn.addEventListener('click', () => {
    if (currentData.length === 0) {
        alert('업로드된 데이터가 없습니다.');
        return;
    }

    let added = 0;
    let skipped = 0;

    currentData.forEach(item => {
        if (!emailSet.has(item.email)) {
            mergedData.push(item);
            emailSet.add(item.email);
            added++;
        } else {
            skipped++;
        }
    });

    showResult(`합치기 완료: ${added}개 추가, ${skipped}개 중복 제거됨. 총 ${mergedData.length}개 데이터`);
    updateMergedInfo();
});

// 빼기 버튼 클릭
subtractBtn.addEventListener('click', () => {
    if (mergedData.length === 0) {
        alert('먼저 합치기를 수행하거나 데이터를 업로드하세요.');
        return;
    }

    if (currentData.length === 0) {
        alert('업로드된 데이터가 없습니다.');
        return;
    }

    const emailsToRemove = new Set(currentData.map(item => item.email));
    const beforeCount = mergedData.length;
    
    mergedData = mergedData.filter(item => !emailsToRemove.has(item.email));
    emailSet = new Set(mergedData.map(item => item.email));
    
    const removed = beforeCount - mergedData.length;

    showResult(`빼기 완료: ${removed}개 제거됨. 남은 데이터: ${mergedData.length}개`);
    updateMergedInfo();
});

// 결과 표시
function showResult(message) {
    resultText.textContent = message;
    resultInfo.style.display = 'block';
}

// 미리보기 결과만 초기화 (합쳐진 데이터는 유지)
function resetPreviewResult() {
    resultInfo.style.display = 'none';
    // mergedData는 유지
}

// 전체 초기화 (합쳐진 데이터 포함)
function resetAll() {
    resultInfo.style.display = 'none';
    downloadBtn.disabled = true;
    mergedData = [];
    emailSet = new Set();
    currentData = [];
    updateMergedInfo();
}

// 합쳐진 데이터 정보 업데이트
function updateMergedInfo() {
    if (mergedData.length > 0) {
        mergedInfo.style.display = 'block';
        mergedCount.textContent = mergedData.length;
        downloadBtn.disabled = false;
    } else {
        mergedInfo.style.display = 'none';
        downloadBtn.disabled = true;
    }
}

// EUC-KR로 저장하는 함수
async function saveAsEucKr(text, filename) {
    try {
        // 1. 문자열을 스트림으로 변환
        const stream = new ReadableStream({
            start(controller) {
                controller.enqueue(text);
                controller.close();
            }
        });

        // 2. euc-kr 인코딩 스트림 적용
        const encodedStream = stream.pipeThrough(new TextEncoderStream('euc-kr'));

        // 3. 데이터를 바이트 배열로 수집
        const reader = encodedStream.getReader();
        let chunks = [];
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(value);
        }

        // 4. Blob 생성 및 저장
        const blob = new Blob(chunks, { type: 'text/csv;charset=euc-kr' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        // TextEncoderStream이 euc-kr을 지원하지 않는 경우 fallback
        console.warn('TextEncoderStream euc-kr 미지원, UTF-8로 저장:', error);
        const BOM = '\uFEFF';
        const encoder = new TextEncoder();
        const bytes = encoder.encode(BOM + text);
        const blob = new Blob([bytes], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// 다운로드 버튼 클릭
downloadBtn.addEventListener('click', async () => {
    if (mergedData.length === 0) {
        alert('다운로드할 데이터가 없습니다.');
        return;
    }

    // CSV 생성
    let csv = '"name","email"\n';
    mergedData.forEach(item => {
        csv += `"${item.name}","${item.email}"\n`;
    });

    // EUC-KR로 저장
    const filename = `merged_data_${new Date().toISOString().slice(0, 10)}.csv`;
    await saveAsEucKr(csv, filename);
});

// 초기화 버튼 클릭
resetBtn.addEventListener('click', () => {
    if (confirm('모든 데이터를 초기화하시겠습니까? 합쳐진 데이터도 모두 삭제됩니다.')) {
        resetAll();
        workSection.style.display = 'none';
        fileInput.value = '';
    }
});

